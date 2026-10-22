package expo.modules.receiptnative

import androidx.core.os.bundleOf
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ReceiptNativeModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ReceiptNative")

        // headerBlocksJson/footerBlocksJson: JSON-stringified block arrays
        // (see ReceiptTextContent.jsx for the shape). Returns
        // { header: base64|null, footer: base64|null }, each the
        // fully-encoded ESC/POS raster command for that block group.
        AsyncFunction("renderTextBlocksToRaster") Coroutine {
                headerBlocksJson: String,
                footerBlocksJson: String ->
            withContext(Dispatchers.Default) {
                bundleOf(
                    "header" to TextRasterRenderer.renderBlocksToRasterBase64(
                        context,
                        headerBlocksJson,
                    ),
                    "footer" to TextRasterRenderer.renderBlocksToRasterBase64(
                        context,
                        footerBlocksJson,
                    ),
                )
            }
        }

        // source: a "data:...;base64,..." URI or an http(s) URL.
        // Returns base64 of the fully-encoded ESC/POS raster command, or
        // null if the image couldn't be decoded.
        AsyncFunction("decodeImageToRaster") Coroutine { source: String, maxWidth: Int ->
            withContext(Dispatchers.Default) {
                ImageRasterizer.decodeToRasterBase64(source, maxWidth)
            }
        }

        // payloadBase64: the full ESC/POS receipt buffer, base64-encoded.
        AsyncFunction("printOverNetwork") Coroutine {
                payloadBase64: String,
                host: String,
                port: Int,
                connectTimeoutMs: Int ->
            withContext(Dispatchers.IO) {
                TcpPrinter.print(payloadBase64, host, port, connectTimeoutMs)
            }
        }
    }

    private val context
        get() = requireNotNull(appContext.reactContext) {
            "React Application Context is null"
        }
}
