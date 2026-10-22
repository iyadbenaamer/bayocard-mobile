import { requireOptionalNativeModule } from "expo-modules-core";

// requireOptionalNativeModule returns null instead of throwing when the
// module hasn't been linked (Expo Go, web, or before the app has been
// rebuilt after this module was added), so every export below has a safe
// "not available" path - callers fall back to the existing pure-JS
// printing pipeline in that case rather than crashing.
const ReceiptNative = requireOptionalNativeModule("ReceiptNative");

export function isReceiptNativeAvailable() {
  return ReceiptNative !== null;
}

// headerBlocks/footerBlocks: arrays of { type: "title" | "field" | "text" |
// "separator", ... } (see ReceiptTextContent.jsx for the shape each type
// expects). Resolves to { header: base64|null, footer: base64|null },
// each the fully-encoded ESC/POS raster command for that block group -
// rendered natively via Android's Canvas/StaticLayout instead of an
// off-screen React render + screenshot capture.
export function renderTextBlocksToRaster(headerBlocks, footerBlocks) {
  if (!ReceiptNative) {
    return Promise.reject(new Error("RECEIPT_NATIVE_UNAVAILABLE"));
  }
  return ReceiptNative.renderTextBlocksToRaster(
    JSON.stringify(headerBlocks),
    JSON.stringify(footerBlocks),
  );
}

// source: a "data:...;base64,..." URI or an http(s) URL. maxWidth: target
// raster width in dots. Resolves to a base64 string of the fully-encoded
// ESC/POS raster command (ready to concatenate directly into a payload
// Buffer) or null if the image couldn't be decoded.
export function decodeImageToRaster(source, maxWidth) {
  if (!ReceiptNative) {
    return Promise.reject(new Error("RECEIPT_NATIVE_UNAVAILABLE"));
  }
  return ReceiptNative.decodeImageToRaster(source, maxWidth);
}

// payloadBase64: the full ESC/POS receipt buffer, base64-encoded.
export function printOverNetwork(
  payloadBase64,
  host,
  port,
  connectTimeoutMs = 3000,
) {
  if (!ReceiptNative) {
    return Promise.reject(new Error("RECEIPT_NATIVE_UNAVAILABLE"));
  }
  return ReceiptNative.printOverNetwork(
    payloadBase64,
    host,
    port,
    connectTimeoutMs,
  );
}
