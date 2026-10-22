import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { registerReceiptTextRenderer } from "../../services/receiptTextCapture";
import ReceiptTextContent from "./ReceiptTextContent";

// Width the receipt text is laid out at (device-independent points), before
// being captured at CAPTURE_PIXEL_RATIO and downsampled by printUtils.js's
// existing raster pipeline down to the printer's actual dot width. The
// oversampling gives that downsample step real antialiasing to work with
// instead of jagged 1:1 pixels. This runs on every single print (unlike
// the logo/card-art rasters, it can't be cached - the text differs per
// card), so it's the dominant per-print cost: the captured PNG is decoded
// and box-downsampled in pure JS, and both scale with the *square* of this
// ratio. 2x is already enough oversampling for a clean threshold (see
// thresholdToBilevel in printUtils.js); the previous 3x meant decoding and
// downsampling 2.25x more pixels than necessary on every print.
export const RECEIPT_CONTENT_WIDTH = 384;
const CAPTURE_PIXEL_RATIO = 2;

// Mounted once near the app root. Renders a receipt's header and footer
// blocks off-screen (far outside the viewport, not just transparent, so it
// never flashes on screen) as two sibling views, snapshots each as a PNG,
// then unmounts both. See services/receiptTextCapture.js for the calling
// side - printUtils.js has no React tree of its own to render into.
//
// Header and footer are captured together instead of as two separate
// sequential jobs. Each capture needs a real native paint before
// react-native-view-shot can read it back, which costs a layout pass plus
// a couple of animation frames of wall-clock time - paying that once for
// both blocks (rendered as siblings in the same commit, captured via two
// concurrent captureRef calls) instead of twice removes a whole extra
// render/paint round-trip from every print.
const ReceiptCaptureHost = () => {
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const jobIdRef = useRef(0);
  const pendingRef = useRef(null);
  const readyCountRef = useRef(0);
  // react-native-view-shot v5 dropped the `pixelRatio` capture option in
  // favor of explicit width/height - these hold each view's actual
  // rendered height (from onLayout) so the 2x oversampling below stays
  // proportional to the real content instead of a hardcoded guess.
  const headerHeightRef = useRef(0);
  const footerHeightRef = useRef(0);
  const [job, setJob] = useState(null);

  useEffect(() => {
    const renderer = (headerBlocks, footerBlocks) =>
      new Promise((resolve, reject) => {
        jobIdRef.current += 1;
        pendingRef.current = { resolve, reject };
        readyCountRef.current = 0;
        setJob({ id: jobIdRef.current, headerBlocks, footerBlocks });
      });
    return registerReceiptTextRenderer(renderer);
  }, []);

  // Header and footer are siblings mounted in the same commit, so both
  // fire onLayout - wait for both before capturing anything.
  const handleReady = () => {
    if (!job) return;
    readyCountRef.current += 1;
    if (readyCountRef.current < 2) return;

    const pending = pendingRef.current;
    if (!pending) return;

    // Android needs the native draw buffer to actually be painted before
    // captureRef reads it back - onLayout alone can fire a frame early.
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          const [header, footer] = await Promise.all([
            captureRef(headerRef.current, {
              format: "png",
              result: "base64",
              width: RECEIPT_CONTENT_WIDTH * CAPTURE_PIXEL_RATIO,
              height: headerHeightRef.current * CAPTURE_PIXEL_RATIO,
            }),
            captureRef(footerRef.current, {
              format: "png",
              result: "base64",
              width: RECEIPT_CONTENT_WIDTH * CAPTURE_PIXEL_RATIO,
              height: footerHeightRef.current * CAPTURE_PIXEL_RATIO,
            }),
          ]);
          pending.resolve({ header, footer });
        } catch (err) {
          pending.reject(err);
        } finally {
          pendingRef.current = null;
          setJob(null);
        }
      });
    });
  };

  const handleHeaderLayout = (event) => {
    headerHeightRef.current = event.nativeEvent.layout.height;
    handleReady();
  };

  const handleFooterLayout = (event) => {
    footerHeightRef.current = event.nativeEvent.layout.height;
    handleReady();
  };

  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={{ position: "absolute", top: 0, left: -100000 }}
    >
      {job ? (
        <View key={job.id} collapsable={false}>
          <View
            ref={headerRef}
            collapsable={false}
            style={{ width: RECEIPT_CONTENT_WIDTH }}
            onLayout={handleHeaderLayout}
          >
            <ReceiptTextContent blocks={job.headerBlocks} />
          </View>
          <View
            ref={footerRef}
            collapsable={false}
            style={{ width: RECEIPT_CONTENT_WIDTH }}
            onLayout={handleFooterLayout}
          >
            <ReceiptTextContent blocks={job.footerBlocks} />
          </View>
        </View>
      ) : null}
    </View>
  );
};

export default ReceiptCaptureHost;
