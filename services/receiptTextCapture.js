// Bridge between the plain-JS printing pipeline (printUtils.js) and the
// off-screen React component that actually renders Arabic receipt text
// (components/print/ReceiptCaptureHost.jsx, mounted once in app/_layout.jsx).
// Generic ESC/POS clone printers each ship their own, often undocumented,
// Arabic code-table mapping, so windows-1256 bytes frequently render as the
// wrong glyphs on real hardware. Rendering the text natively with React
// Native (which shapes/bidi's Arabic correctly by construction) and sending
// the printer a bitmap instead sidesteps that entirely.

let currentRenderer = null;

// Called by ReceiptCaptureHost on mount/unmount to publish (or clear) the
// function that turns a header+footer block pair into captured PNGs.
export function registerReceiptTextRenderer(renderer) {
  currentRenderer = renderer;
  return () => {
    if (currentRenderer === renderer) {
      currentRenderer = null;
    }
  };
}

// Captures happen one pair at a time (the host only mounts one content
// tree), so concurrent callers are serialized through this queue rather
// than racing to overwrite each other's off-screen content.
let queue = Promise.resolve();

// headerBlocks/footerBlocks: array of { type: "title" | "field" | "text" |
// "separator", ... } (see ReceiptTextContent.jsx for the shape each type
// expects). The receipt's header and footer are captured together in a
// single native screenshot round-trip - the printed layout still needs
// them as two separate rasters (the QR code prints between them), but
// there's no reason to pay for two full off-screen mount+layout+paint
// cycles when one covers both. Resolves to
// { header: base64|null, footer: base64|null }.
export function captureReceiptTextPair(headerBlocks, footerBlocks) {
  const run = async () => {
    if (!currentRenderer) {
      throw new Error("RECEIPT_CAPTURE_HOST_NOT_MOUNTED");
    }
    return currentRenderer(headerBlocks, footerBlocks);
  };

  const result = queue.then(run, run);
  queue = result.then(
    () => {},
    () => {},
  );
  return result;
}
