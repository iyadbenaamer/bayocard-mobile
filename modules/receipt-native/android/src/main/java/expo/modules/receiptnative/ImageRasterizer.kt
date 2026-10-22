package expo.modules.receiptnative

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

/**
 * Mirrors printUtils.js's logoToRaster() pipeline (fetch -> decode -> gray
 * -> box-downsample -> Floyd-Steinberg dither -> ESC/POS raster), but runs
 * on Android's native Bitmap/BitmapFactory codecs instead of a pure-JS PNG
 * inflate implementation, with the pixel math running as JIT-compiled JVM
 * bytecode instead of Hermes-interpreted JS. Used for card-art images
 * (fetched fresh per tier) - the app's own logo is small and already
 * cached on the JS side after the first print, so it isn't worth moving.
 */
object ImageRasterizer {
    fun decodeToRasterBase64(source: String, maxWidth: Int): String? {
        val bytes = fetchBytes(source) ?: return null
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null

        val gray = toGrayscale(bitmap)
        bitmap.recycle()

        val downsampled = downsample(gray, maxWidth)
        val dithered = ditherToBilevel(downsampled)

        val raster = EscPosRaster.encode(downsampled.width, downsampled.height, dithered)
        return Base64.encodeToString(raster, Base64.NO_WRAP)
    }

    private fun fetchBytes(source: String): ByteArray? {
        return try {
            if (source.startsWith("data:")) {
                val comma = source.indexOf(',')
                if (comma < 0) return null
                Base64.decode(source.substring(comma + 1), Base64.DEFAULT)
            } else {
                val connection = URL(source).openConnection() as HttpURLConnection
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                try {
                    connection.inputStream.use { input ->
                        val output = ByteArrayOutputStream()
                        input.copyTo(output)
                        output.toByteArray()
                    }
                } finally {
                    connection.disconnect()
                }
            }
        } catch (e: Exception) {
            null
        }
    }

    private class GrayImage(val width: Int, val height: Int, val pixels: FloatArray)

    // Alpha-composites onto white first, matching parseBmpGray/parsePngGray's
    // `a < 128 ? 255 : luminance` handling in printUtils.js.
    private fun toGrayscale(bitmap: Bitmap): GrayImage {
        val width = bitmap.width
        val height = bitmap.height
        val argb = IntArray(width * height)
        bitmap.getPixels(argb, 0, width, 0, 0, width, height)

        val gray = FloatArray(width * height)
        for (i in argb.indices) {
            val pixel = argb[i]
            val a = (pixel ushr 24) and 0xff
            if (a < 128) {
                gray[i] = 255f
            } else {
                val r = (pixel ushr 16) and 0xff
                val g = (pixel ushr 8) and 0xff
                val b = pixel and 0xff
                gray[i] = r * 0.3f + g * 0.59f + b * 0.11f
            }
        }
        return GrayImage(width, height, gray)
    }

    // Box-downsample (average blocks of source pixels), matching
    // printUtils.js's downsampleGray - keeps edges recognizable instead of
    // just dropping most source pixels when shrinking to the print width.
    private fun downsample(src: GrayImage, maxWidth: Int): GrayImage {
        if (src.width <= maxWidth) return src

        val scale = maxWidth.toFloat() / src.width
        val newWidth = maxWidth
        val newHeight = max(1, round(src.height * scale).toInt())
        val out = FloatArray(newWidth * newHeight)

        for (y in 0 until newHeight) {
            val srcY0 = floor(y / scale).toInt()
            val srcY1 = max(srcY0 + 1, min(src.height, ceil((y + 1) / scale).toInt()))
            for (x in 0 until newWidth) {
                val srcX0 = floor(x / scale).toInt()
                val srcX1 = max(srcX0 + 1, min(src.width, ceil((x + 1) / scale).toInt()))

                var sum = 0f
                var count = 0
                for (sy in srcY0 until srcY1) {
                    for (sx in srcX0 until srcX1) {
                        sum += src.pixels[sy * src.width + sx]
                        count++
                    }
                }
                out[y * newWidth + x] = if (count > 0) sum / count else 255f
            }
        }
        return GrayImage(newWidth, newHeight, out)
    }

    // Floyd-Steinberg error-diffusion dithering, matching printUtils.js's
    // ditherToBilevel - worth its cost here since card art can be
    // photographic/gradient content, unlike rendered receipt text.
    private fun ditherToBilevel(img: GrayImage): BooleanArray {
        val work = img.pixels.copyOf()
        val width = img.width
        val height = img.height
        val result = BooleanArray(width * height)

        for (y in 0 until height) {
            for (x in 0 until width) {
                val i = y * width + x
                val isBlack = work[i] < 128f
                result[i] = isBlack
                val err = work[i] - (if (isBlack) 0f else 255f)

                if (x + 1 < width) work[i + 1] += err * (7f / 16f)
                if (x - 1 >= 0 && y + 1 < height) work[i + width - 1] += err * (3f / 16f)
                if (y + 1 < height) work[i + width] += err * (5f / 16f)
                if (x + 1 < width && y + 1 < height) work[i + width + 1] += err * (1f / 16f)
            }
        }
        return result
    }
}
