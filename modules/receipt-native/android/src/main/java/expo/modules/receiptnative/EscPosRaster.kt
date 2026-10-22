package expo.modules.receiptnative

/**
 * Packs a 1-bit-per-pixel bitmap into an ESC/POS "GS v 0" raster image
 * command - the same wire format printUtils.js's encodeRaster() produces
 * on the JS side, so the bytes returned here can be concatenated directly
 * into a receipt payload built in JS.
 */
object EscPosRaster {
    fun encode(width: Int, height: Int, blackPixels: BooleanArray): ByteArray {
        val bytesPerLine = (width + 7) / 8
        val header = byteArrayOf(
            0x1d, 0x76, 0x30, 0x00,
            (bytesPerLine and 0xff).toByte(),
            ((bytesPerLine shr 8) and 0xff).toByte(),
            (height and 0xff).toByte(),
            ((height shr 8) and 0xff).toByte(),
        )

        val imageData = ByteArray(bytesPerLine * height)
        for (y in 0 until height) {
            val rowBase = y * width
            val lineBase = y * bytesPerLine
            for (x in 0 until width) {
                if (blackPixels[rowBase + x]) {
                    val idx = lineBase + (x shr 3)
                    imageData[idx] = (imageData[idx].toInt() or (0x80 shr (x and 7))).toByte()
                }
            }
        }

        return header + imageData
    }
}
