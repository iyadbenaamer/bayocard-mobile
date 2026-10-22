import { Buffer } from "buffer";
import TcpSocket from "react-native-tcp-socket";
import UPNG from "upng-js";
import * as ImageManipulator from "expo-image-manipulator";

import { store } from "../state/store.js";
import { logoBase64 } from "../assets/logoBased64.js";
import { captureReceiptTextPair } from "./receiptTextCapture.js";
import formatDate, { formatExpiryDate } from "../utils/formatDate.js";
import {
  isReceiptNativeAvailable,
  renderTextBlocksToRaster as renderTextBlocksToRasterNative,
  decodeImageToRaster as decodeImageToRasterNative,
  printOverNetwork as printOverNetworkNative,
} from "../modules/receipt-native/index.js";

const CENTER = Buffer.from([0x1b, 0x61, 0x01]);
const FEED_1 = Buffer.from([0x1b, 0x64, 0x01]);
const FEED_2 = Buffer.from([0x1b, 0x64, 0x02]);
const FULL_CUT = Buffer.from([0x1d, 0x56, 0x00]);
const QR_SIZE_DEFAULT = 4;

// Every generic ESC/POS clone printer ships its own, often undocumented,
// Arabic code table, and in practice they routinely don't match
// windows-1256 byte-for-byte - the printer ends up substituting the wrong
// glyphs even though the right code page command was sent. Rather than
// guess per printer model, all Arabic content is rendered natively with
// React Native (see ReceiptTextContent.jsx / receiptTextCapture.js) and
// sent to every printer as a plain 1-bit raster image, exactly like the
// logo/card art below. That also means no text on the wire is ever
// non-ASCII, so a single buffer now works for every transport.
function asciiLine(str) {
  return Buffer.from(str + "\n", "utf8");
}

/* =========================
   ESC/POS NATIVE QR
========================= */
function escposQR(text, size = QR_SIZE_DEFAULT) {
  const textBytes = Buffer.from(text, "utf8");
  const length = textBytes.length + 3;

  const numericSize = Number(size);
  const normalizedSize = Number.isFinite(numericSize)
    ? Math.round(numericSize)
    : QR_SIZE_DEFAULT;
  const sizeValue = Math.min(16, Math.max(1, normalizedSize));

  const pL = length & 0xff;
  const pH = (length >> 8) & 0xff;

  const model = Buffer.from([
    0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
  ]);

  const sizeCmd = Buffer.from([
    0x1d,
    0x28,
    0x6b,
    0x03,
    0x00,
    0x31,
    0x43,
    sizeValue,
  ]);

  const error = Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]);

  const store = Buffer.concat([
    Buffer.from([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    textBytes,
  ]);

  const print = Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);

  return Buffer.concat([model, sizeCmd, error, store, print]);
}

/* =========================
   Image → Raster (logo/card art)
   Uploaded print images have no size constraint from the admin panel and
   can be BMP or PNG, so this decodes either format to grayscale, then
   downsamples to the printer's dot width before thresholding to 1-bit -
   sending a raster command wider than the print head supports gets
   silently dropped by the printer.
========================= */

const DEFAULT_MAX_RASTER_WIDTH = 384; // dots - matches a 58mm print head

function encodeRaster({ width, height, pixels }) {
  const bytesPerLine = Math.ceil(width / 8);
  const header = Buffer.from([
    0x1d,
    0x76,
    0x30,
    0x00,
    bytesPerLine & 0xff,
    (bytesPerLine >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
  ]);

  const imageData = Buffer.alloc(bytesPerLine * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[y * width + x])
        imageData[y * bytesPerLine + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }

  return [header, imageData];
}

// Returns { width, height, gray } where gray is one luminance byte per
// pixel (0-255, alpha already composited onto white) - a format-agnostic
// intermediate shared by every decoder below.
function parseBmpGray(buf) {
  if (buf.length < 54 || buf.readUInt16LE(0) !== 0x4d42) return null;

  const offset = buf.readUInt32LE(10);
  const width = buf.readUInt32LE(18);
  let height = buf.readUInt32LE(22);
  const bpp = buf.readUInt16LE(28);

  if (bpp !== 24 && bpp !== 32) return null;

  const flip = height > 0;
  height = Math.abs(height);
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4;

  const gray = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const rowStart = offset + (flip ? height - 1 - y : y) * rowSize;
    const row = buf.subarray(rowStart, rowStart + rowSize);

    for (let x = 0; x < width; x++) {
      const px = x * (bpp / 8);
      const b = row[px];
      const g = row[px + 1];
      const r = row[px + 2];
      const a = bpp === 32 ? row[px + 3] : 255;

      gray[y * width + x] =
        a < 128 ? 255 : Math.round(r * 0.3 + g * 0.59 + b * 0.11);
    }
  }

  return { width, height, gray };
}

function parsePngGray(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return null;

  let decoded;
  try {
    const arrayBuffer = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    );
    decoded = UPNG.decode(arrayBuffer);
  } catch {
    return null;
  }

  const { width, height } = decoded;
  const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
  const gray = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const a = rgba[i * 4 + 3];
    gray[i] = a < 128 ? 255 : Math.round(r * 0.3 + g * 0.59 + b * 0.11);
  }

  return { width, height, gray };
}

// Box-downsamples (averages blocks of source pixels rather than dropping
// most of them) so a downscaled logo keeps recognizable edges instead of
// looking like random noise once thresholded to 1-bit.
function downsampleGray(width, height, gray, maxWidth) {
  if (width <= maxWidth) return { width, height, gray };

  const scale = maxWidth / width;
  const newWidth = maxWidth;
  const newHeight = Math.max(1, Math.round(height * scale));
  const out = new Uint8Array(newWidth * newHeight);

  for (let y = 0; y < newHeight; y++) {
    const srcY0 = Math.floor(y / scale);
    const srcY1 = Math.max(
      srcY0 + 1,
      Math.min(height, Math.ceil((y + 1) / scale)),
    );
    for (let x = 0; x < newWidth; x++) {
      const srcX0 = Math.floor(x / scale);
      const srcX1 = Math.max(
        srcX0 + 1,
        Math.min(width, Math.ceil((x + 1) / scale)),
      );

      let sum = 0;
      let count = 0;
      for (let sy = srcY0; sy < srcY1; sy++) {
        for (let sx = srcX0; sx < srcX1; sx++) {
          sum += gray[sy * width + sx];
          count++;
        }
      }
      out[y * newWidth + x] = count ? Math.round(sum / count) : 255;
    }
  }

  return { width: newWidth, height: newHeight, gray: out };
}

// Floyd-Steinberg error-diffusion dithering. A flat 50% threshold turns any
// gradient/anti-aliased shading into odd-looking flat facets; diffusing the
// per-pixel rounding error into neighboring pixels produces a halftone-like
// stipple that reads as smooth shading on a 1-bit printer instead.
function ditherToBilevel(width, height, gray) {
  const work = Float32Array.from(gray);
  const pixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const isBlack = work[i] < 128;
      pixels[i] = isBlack ? 1 : 0;
      const err = work[i] - (isBlack ? 0 : 255);

      if (x + 1 < width) work[i + 1] += err * (7 / 16);
      if (x - 1 >= 0 && y + 1 < height) work[i + width - 1] += err * (3 / 16);
      if (y + 1 < height) work[i + width] += err * (5 / 16);
      if (x + 1 < width && y + 1 < height)
        work[i + width + 1] += err * (1 / 16);
    }
  }

  return pixels;
}

// Flat 50% threshold - much cheaper than ditherToBilevel's per-pixel error
// diffusion (no sequential neighbor propagation). Dithering earns its cost
// on photographic/gradient art (see logoToRaster below); rendered text is
// already crisp black-on-white after React's own anti-aliasing, so a flat
// threshold looks just as clean without paying for stipple diffusion on
// every print.
function thresholdToBilevel(width, height, gray) {
  const pixels = new Uint8Array(width * height);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = gray[i] < 128 ? 1 : 0;
  }
  return pixels;
}

// parseBmpGray/parsePngGray only understand those two formats, but uploaded
// print images have no format constraint from the admin panel and are
// commonly JPEG. Re-encode anything neither decoder recognized to PNG via
// the native image decoder and retry once before giving up.
async function normalizeToPngGray(source) {
  try {
    const result = await ImageManipulator.manipulateAsync(source, [], {
      base64: true,
      format: ImageManipulator.SaveFormat.PNG,
    });
    if (!result?.base64) return null;
    return parsePngGray(Buffer.from(result.base64, "base64"));
  } catch {
    return null;
  }
}

async function logoToRaster(source, maxWidth = DEFAULT_MAX_RASTER_WIDTH) {
  if (!source) return null;

  // fetch the image bytes (local asset or remote URL) and convert to Buffer
  let buf;

  if (source.startsWith("data:")) {
    const comma = source.indexOf(",");
    const base64part = source.slice(comma + 1);
    buf = Buffer.from(base64part, "base64");
  } else if (typeof source === "string") {
    const response = await fetch(source).catch(() => null);
    if (!response) return null;
    const arrayBuffer = await response.arrayBuffer();
    buf = Buffer.from(arrayBuffer);
  } else {
    return null;
  }

  const decoded =
    parseBmpGray(buf) ||
    parsePngGray(buf) ||
    (await normalizeToPngGray(source));
  if (!decoded) return null;

  const { width, height, gray } = downsampleGray(
    decoded.width,
    decoded.height,
    decoded.gray,
    maxWidth,
  );
  return { width, height, pixels: ditherToBilevel(width, height, gray) };
}

// Runs a captured PNG (base64) through the same decode/downsample pipeline
// used for logo/card art above (thresholded rather than dithered - see
// thresholdToBilevel), so it can be sent with the same encodeRaster() as
// any other image.
function capturedPngToRaster(base64, maxWidth) {
  if (!base64) return null;
  const buf = Buffer.from(base64, "base64");
  const decoded = parsePngGray(buf);
  if (!decoded) return null;

  const { width, height, gray } = downsampleGray(
    decoded.width,
    decoded.height,
    decoded.gray,
    maxWidth,
  );
  return { width, height, pixels: thresholdToBilevel(width, height, gray) };
}

// Renders the header and footer block specs (see ReceiptTextContent.jsx)
// to ready-to-send ESC/POS raster bytes. Prefers the native path (Android
// Canvas/StaticLayout, see TextRasterRenderer.kt) - it draws text directly
// instead of mounting a React tree off-screen and screenshotting it, which
// is what actually dominated print latency (the capture round-trip itself
// has heavy fixed overhead on weak hardware, independent of pixel count).
// Falls back to the React/screenshot pipeline when the native module isn't
// linked or errors, so printing keeps working either way.
async function textBlocksToRasterPair(
  headerBlocks,
  footerBlocks,
  maxWidth = DEFAULT_MAX_RASTER_WIDTH,
) {
  if (isReceiptNativeAvailable()) {
    try {
      const { header, footer } = await renderTextBlocksToRasterNative(
        headerBlocks,
        footerBlocks,
      );
      return [
        header ? Buffer.from(header, "base64") : null,
        footer ? Buffer.from(footer, "base64") : null,
      ];
    } catch {
      // fall through to the JS/React capture pipeline below
    }
  }

  const { header, footer } = await captureReceiptTextPair(
    headerBlocks,
    footerBlocks,
  );
  const headerRaster = capturedPngToRaster(header, maxWidth);
  const footerRaster = capturedPngToRaster(footer, maxWidth);
  return [
    headerRaster ? Buffer.concat(encodeRaster(headerRaster)) : null,
    footerRaster ? Buffer.concat(encodeRaster(footerRaster)) : null,
  ];
}

// The app's print logo is a static bundled asset - it's the same bitmap on
// every single receipt for the lifetime of the app, so decoding/
// downsampling/dithering it over again on every print is pure waste.
// Computed once and reused forever.
let cachedLogoRasterPromise = null;
function getLogoRaster() {
  if (!cachedLogoRasterPromise) {
    cachedLogoRasterPromise = logoToRaster(logoBase64).catch((err) => {
      cachedLogoRasterPromise = null; // let the next print retry
      throw err;
    });
  }
  return cachedLogoRasterPromise;
}

// A tier's card-art image is identical across every card of that tier, and
// "print all" prints many cards back-to-back - without caching, each one
// re-fetches the same image over the network and re-runs the decode/
// downsample/dither pipeline on it. Cached per URL so only the first card
// of a run pays that cost. Resolves to a ready-to-send Buffer (the fully
// encoded ESC/POS raster command) rather than a {width, height, pixels}
// triple, since the native path below returns bytes directly and the two
// paths need a common shape.
const cardImageRasterCache = new Map(); // url -> Promise<Buffer|null>
function getCardImageRaster(url) {
  if (!url) return Promise.resolve(null);
  if (!cardImageRasterCache.has(url)) {
    const promise = buildCardImageRasterBytes(url).catch((err) => {
      cardImageRasterCache.delete(url); // let the next print retry
      throw err;
    });
    cardImageRasterCache.set(url, promise);
  }
  return cardImageRasterCache.get(url);
}

// Prefers the native (Kotlin) decode/downsample/dither pipeline - Android's
// BitmapFactory decodes PNG/JPEG/BMP natively instead of through a pure-JS
// PNG inflate, and the pixel loops run as JVM bytecode instead of
// Hermes-interpreted JS. Falls back to the JS pipeline when the native
// module isn't linked (e.g. Expo Go, or before a rebuild that includes it)
// or if it errors on a particular image, so printing keeps working either
// way.
async function buildCardImageRasterBytes(url) {
  if (isReceiptNativeAvailable()) {
    try {
      const base64 = await decodeImageToRasterNative(
        url,
        DEFAULT_MAX_RASTER_WIDTH,
      );
      return base64 ? Buffer.from(base64, "base64") : null;
    } catch {
      // fall through to the JS pipeline below
    }
  }

  const raster = await logoToRaster(url);
  if (!raster) return null;
  return Buffer.concat(encodeRaster(raster));
}

/* =========================
   ESC/POS BUFFER BUILDER
   (transport-agnostic: the same bytes are sent over
   network sockets, Bluetooth SPP, or USB bulk transfer)
========================= */

export async function buildReceiptBuffer(data, info) {
  const parts = [];

  const serverOrigin = process.env.EXPO_PUBLIC_API_URL;

  let printImageUrl = null;

  if (data.printImage) {
    if (data.printImage.startsWith("/")) {
      printImageUrl = serverOrigin + data.printImage;
    } else {
      printImageUrl = data.printImage;
    }
  }
  const card = data.card || {};
  const title = data.title || "";
  const tierName = data.tierName || "";

  // Grouped into 4-character blocks - the same convention leading gift-card
  // brands (Steam, Google Play, Apple...) use for redemption codes, applied
  // here too so the printed card matches the in-app code display.
  const codeStr =
    String(card.code || "")
      .match(/.{1,4}/g)
      ?.join("  ") || "";

  const headerBlocks = [
    { type: "title", text: `${tierName ? tierName + " - " : ""}${title}` },
    { type: "codeBox", label: "الرمز", value: codeStr },
  ];
  if (card.pin) {
    const pinStr =
      String(card.pin)
        .match(/.{1,4}/g)
        ?.join("  ") || String(card.pin);
    headerBlocks.push({
      type: "codeBox",
      label: "الرقم السري",
      value: pinStr,
    });
  }
  if (card.expiryDate) {
    const showDay = data.showExpiryDateDay !== false;
    headerBlocks.push({
      type: "field",
      label: "تاريخ الانتهاء",
      value: `${formatExpiryDate(card.expiryDate, showDay)}`,
      ltr: true,
    });
  }

  const footerBlocks = [];
  if (card.redeemFormat) {
    footerBlocks.push({
      type: "text",
      label: "طريقة التعبئة",
      text: `\u202A${card.redeemFormat
        .replace("{code}", " الرمز ")
        .replace("tel:", "")}`,
    });
  }
  if (data.notes) {
    footerBlocks.push({
      type: "text",
      label: "ملاحظات",
      text: String(data.notes).replace(/\r\n/g, "\n").replace(/\\n/g, "\n"),
    });
  }
  footerBlocks.push({ type: "separator" });
  footerBlocks.push({ type: "field", label: "البائع", value: info.name || "" });
  footerBlocks.push({
    type: "field",
    label: "الرقم التسلسلي",
    value: card.serialNumber || "",
    ltr: true,
  });
  footerBlocks.push({
    type: "field",
    label: "الدعم الفني",
    value: info.support || "",
    ltr: true,
  });
  footerBlocks.push({
    type: "field",
    label: "التاريخ",
    value: formatDate(new Date()),
  });

  // Independent work (the logo/card-art decode pipeline and the text
  // rendering pipeline don't touch each other) run concurrently instead of
  // one after another, so a cache miss on the logo/card art overlaps with
  // the header/footer render instead of adding to it.
  const [
    logoRaster,
    cardImageRasterBytes,
    [headerRasterBytes, footerRasterBytes],
  ] = await Promise.all([
    getLogoRaster(),
    getCardImageRaster(printImageUrl),
    textBlocksToRasterPair(headerBlocks, footerBlocks),
  ]);

  const qrPayload = card.redeemFormat
    ? card.redeemFormat.replace("{code}", card.code)
    : card.code;
  const qrSize = data.qrSize ?? QR_SIZE_DEFAULT;
  // Merchant-controlled from Settings ("طباعة رمز QR على البطاقات") -
  // read directly from the store, same as sendToConfiguredPrinter() reads
  // the printer config, rather than threading it through every call site.
  const printQrCode = store.getState().printer.printQrCode !== false;

  parts.push(CENTER);
  if (cardImageRasterBytes) {
    // cardImageRasterBytes/headerRasterBytes/footerRasterBytes are already
    // fully-encoded ESC/POS raster bytes (see buildCardImageRasterBytes /
    // textBlocksToRasterPair) - unlike logoRaster below, they don't go
    // through encodeRaster() here.
    parts.push(cardImageRasterBytes);
  }
  if (headerRasterBytes) {
    parts.push(headerRasterBytes);
  }
  /* ===== QR PRINT ===== */
  if (printQrCode) {
    parts.push(escposQR(`${qrPayload}`, qrSize));
  }
  if (footerRasterBytes) {
    parts.push(footerRasterBytes);
  }
  /* ===== LOGO ===== */
  if (logoRaster) {
    parts.push(...encodeRaster(logoRaster), FEED_2);
  }
  parts.push(asciiLine("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"), FULL_CUT);

  return Buffer.concat(parts);
}

/* =========================
   NETWORK (LAN/embedded) TRANSPORT
   ESC/POS printers listen for raw bytes on a TCP socket,
   conventionally port 9100 (AKA "JetDirect"/RAW printing).
   The built-in printer on POS terminals (e.g. Sunmi devices)
   exposes the same protocol on the loopback interface.
========================= */

// react-native-tcp-socket's Socket.write() signature is
// write(buffer, encoding, cb) - the completion callback is the *third*
// argument. Passing it as the second (as this used to) silently binds it
// to `encoding` instead, so it's never invoked: writeNext() never runs
// again after the first chunk, the whole chunk loop stalls, and every
// chunk after the first (~20KB) is never sent - the printer receives a
// truncated receipt and the socket just hangs afterward instead of being
// closed. Awaiting the real per-chunk write confirmation below both fixes
// the truncation and removes the need for an artificial pacing delay
// between chunks, since the callback already reflects genuine native
// write completion.
function writeChunk(client, chunk) {
  return new Promise((resolve, reject) => {
    client.write(chunk, undefined, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function writeInChunks(client, buffer, chunkSize) {
  let offset = 0;
  while (offset < buffer.length) {
    const chunk = buffer.slice(offset, offset + chunkSize);
    offset += chunkSize;
    await writeChunk(client, chunk);
  }
}

export async function sendOverNetwork(payload, options = {}) {
  const host = options.host || "127.0.0.1";
  const port = options.port || 9100;
  const maxAttempts = options.maxAttempts ?? 10;
  const connectTimeoutMs = options.connectTimeoutMs ?? 3000;

  // The native module implements the same connect/write/retry/flush-delay
  // behavior as the JS path below (see TcpPrinter.kt) - just writing raw
  // bytes to a real java.net.Socket instead of going through Hermes and
  // base64-encoding the payload to cross the JS bridge for every chunk.
  // It already retries internally, so on failure that error is real (the
  // printer is genuinely unreachable) rather than something a second,
  // separate JS-side retry loop should redo.
  if (isReceiptNativeAvailable()) {
    await printOverNetworkNative(
      payload.toString("base64"),
      host,
      port,
      connectTimeoutMs,
    );
    return;
  }

  // helper that attempts a connection once
  const attemptSend = () =>
    new Promise((resolve, reject) => {
      const client = TcpSocket.createConnection({ port, host }, () => {
        // Connection succeeded - connectTimeoutMs should only bound how long
        // we wait to connect, not the write/flush phase that follows (which
        // paces itself and can legitimately take longer for bigger receipts).
        clearTimeout(timer);
        client.setNoDelay(true); // disable Nagle

        writeInChunks(client, payload, 20240)
          .then(() => {
            // Every byte has now genuinely reached the OS socket, but the
            // printer itself still has to drain its own receive buffer and
            // physically print it - a flat delay too short for a bigger
            // (more images/QR) receipt risks the printer discarding
            // whatever it hasn't printed yet once it sees the connection
            // close. Scale the wait with payload size instead of guessing
            // a single constant for every receipt.
            const flushDelayMs = Math.max(800, Math.ceil(payload.length / 20));
            setTimeout(() => {
              client.end();
            }, flushDelayMs);
          })
          .catch((err) => {
            client.destroy();
            reject(err);
          });
      });

      const timer = setTimeout(() => {
        client.destroy();
        reject(new Error("PRINTER_CONNECT_TIMEOUT"));
      }, connectTimeoutMs);

      client.on("error", (e) => {
        clearTimeout(timer);
        client.destroy();
        reject(e);
      });

      client.on("close", () => {
        clearTimeout(timer);
        resolve();
      });
    });

  // retry loop with back-off
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      await attemptSend();
      return; // success
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

// Backward-compatible helper: builds the receipt and sends it straight to
// the embedded/local printer over the loopback interface.
export async function printEscPosLAN(data, info) {
  const payload = await buildReceiptBuffer(data, info);
  await sendOverNetwork(payload, { host: "127.0.0.1", port: 9100 });
}
