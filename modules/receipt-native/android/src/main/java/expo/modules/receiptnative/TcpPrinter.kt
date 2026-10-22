package expo.modules.receiptnative

import android.util.Base64
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket
import kotlin.math.max

/**
 * Mirrors printUtils.js's sendOverNetwork(): connect, write the whole
 * payload, give the printer time to physically drain/print it, then
 * close - retrying with backoff on failure.
 *
 * Writing through a real java.net.Socket means the OS/JVM handle the
 * actual chunking and flow control (no manual chunk-and-wait loop needed
 * the way the JS side has to), and the payload goes over the wire as raw
 * bytes instead of being base64-encoded to cross the JS bridge -
 * react-native-tcp-socket's write() base64-encodes every chunk for the
 * bridge, which is pure overhead once printing itself happens natively.
 */
object TcpPrinter {
    private const val MAX_ATTEMPTS = 10
    private const val RETRY_DELAY_MS = 1000L

    fun print(payloadBase64: String, host: String, port: Int, connectTimeoutMs: Int) {
        val payload = Base64.decode(payloadBase64, Base64.DEFAULT)
        var lastError: IOException? = null

        var attempt = 0
        while (attempt < MAX_ATTEMPTS) {
            try {
                sendOnce(payload, host, port, connectTimeoutMs)
                return
            } catch (e: IOException) {
                lastError = e
                attempt++
                if (attempt >= MAX_ATTEMPTS) throw e
                Thread.sleep(RETRY_DELAY_MS)
            }
        }
        throw lastError ?: IOException("PRINTER_CONNECT_FAILED")
    }

    private fun sendOnce(payload: ByteArray, host: String, port: Int, connectTimeoutMs: Int) {
        Socket().use { socket ->
            socket.tcpNoDelay = true
            socket.connect(InetSocketAddress(host, port), connectTimeoutMs)

            val out = socket.getOutputStream()
            out.write(payload)
            out.flush()

            // Every byte is now genuinely on the wire, but the printer
            // still has to drain its own receive buffer and physically
            // print it - closing too soon risks it discarding whatever it
            // hasn't printed yet. Scales with payload size, matching the
            // JS implementation this replaces.
            val flushDelayMs = max(800, payload.size / 20)
            Thread.sleep(flushDelayMs.toLong())
        }
    }
}
