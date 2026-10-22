package expo.modules.receiptnative

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import org.json.JSONArray

/**
 * Renders receipt text blocks (see ReceiptTextContent.jsx for the JS
 * layout this mirrors) directly onto a Bitmap via Android's own Canvas/
 * StaticLayout, instead of mounting a React tree off-screen and
 * screenshotting it.
 *
 * Android's text layout uses the same ICU/HarfBuzz shaping engine React
 * Native itself delegates to, so Arabic still shapes and bidis correctly
 * "by construction" - the same reason this was moved off raw ESC/POS text
 * commands in the first place - but without paying for a React commit, a
 * native layout pass, a couple of animation frames of wait, and a
 * screenshot-to-PNG-to-decode round trip on every single print. That
 * round-trip (not pixel count, which earlier passes already tuned down)
 * is what dominated print latency on weak hardware.
 */
object TextRasterRenderer {
    private const val CONTENT_WIDTH = 384 // dots - matches DEFAULT_MAX_RASTER_WIDTH
    private const val PADDING_H = 18
    private const val PADDING_V = 14
    private const val TEXT_WIDTH = CONTENT_WIDTH - PADDING_H * 2

    private const val TITLE_SIZE = 30f
    private const val FIELD_SIZE = 26f
    private const val TEXT_SIZE = 24f
    private const val TEXT_LINE_SPACING_EXTRA = 8f // 32 lineHeight - 24 fontSize

    private const val TITLE_MARGIN_BOTTOM = 12
    private const val FIELD_MARGIN_BOTTOM = 8
    private const val TEXT_BLOCK_MARGIN_BOTTOM = 10
    private const val TEXT_LABEL_MARGIN_BOTTOM = 2
    private const val SEPARATOR_MARGIN = 12
    private const val SEPARATOR_THICKNESS = 2

    // A bordered, rounded-corner box for the card's code/PIN - mirrors how
    // leading gift-card brands (Steam, Google Play, Apple...) present
    // redemption codes on a printed card, instead of a plain field line.
    private const val CODE_BOX_LABEL_SIZE = 22f
    private const val CODE_BOX_VALUE_SIZE = 30f
    private const val CODE_BOX_LABEL_MARGIN_BOTTOM = 6
    private const val CODE_BOX_PADDING_H = 14
    private const val CODE_BOX_PADDING_V = 12
    private const val CODE_BOX_RADIUS = 16f
    private const val CODE_BOX_BORDER_WIDTH = 3f
    private const val CODE_BOX_MARGIN_BOTTOM = 12
    private const val CODE_BOX_LETTER_SPACING = 0.08f

    // U+202A (LEFT-TO-RIGHT EMBEDDING) and U+202C (POP DIRECTIONAL
    // FORMATTING) - forces an LTR run (codes, phone numbers) to display
    // correctly within an otherwise-RTL paragraph. Same technique this
    // app's original pre-React ESC/POS text printing used for the same
    // fields. These constants hold the literal (invisible) Unicode
    // characters, not escape sequences.
    private const val LRE = "‪"
    private const val PDF = "‬"

    @Volatile private var regular: Typeface? = null
    @Volatile private var medium: Typeface? = null
    @Volatile private var bold: Typeface? = null

    private fun typeface(context: Context, weight: String): Typeface = when (weight) {
        "bold" -> bold ?: synchronized(this) {
            bold ?: Typeface.createFromAsset(context.assets, "fonts/Tajawal-Bold.ttf").also { bold = it }
        }
        "medium" -> medium ?: synchronized(this) {
            medium ?: Typeface.createFromAsset(context.assets, "fonts/Tajawal-Medium.ttf").also { medium = it }
        }
        else -> regular ?: synchronized(this) {
            regular ?: Typeface.createFromAsset(context.assets, "fonts/Tajawal-Regular.ttf").also { regular = it }
        }
    }

    private fun makePaint(context: Context, weight: String, size: Float): TextPaint {
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG)
        paint.typeface = typeface(context, weight)
        paint.textSize = size
        paint.color = Color.BLACK
        return paint
    }

    private fun makeLayout(
        text: String,
        paint: TextPaint,
        width: Int,
        alignment: Layout.Alignment,
        lineSpacingExtra: Float = 0f,
    ): StaticLayout {
        return StaticLayout.Builder
            .obtain(text, 0, text.length, paint, width)
            .setAlignment(alignment)
            .setTextDirection(TextDirectionHeuristics.RTL)
            .setLineSpacing(lineSpacingExtra, 1f)
            .setIncludePad(false)
            .build()
    }

    private sealed class DrawOp {
        abstract val height: Int

        class Text(val layout: StaticLayout, val marginBottom: Int) : DrawOp() {
            override val height get() = layout.height + marginBottom
        }

        object Separator : DrawOp() {
            override val height get() = SEPARATOR_MARGIN * 2 + SEPARATOR_THICKNESS
        }

        class CodeBox(
            val labelLayout: StaticLayout,
            val valueLayout: StaticLayout,
            val boxWidth: Int,
            val marginBottom: Int,
        ) : DrawOp() {
            val boxHeight = valueLayout.height + CODE_BOX_PADDING_V * 2
            override val height
                get() = labelLayout.height + CODE_BOX_LABEL_MARGIN_BOTTOM + boxHeight + marginBottom
        }
    }

    private fun buildOps(context: Context, blocks: JSONArray): List<DrawOp> {
        val ops = mutableListOf<DrawOp>()
        for (i in 0 until blocks.length()) {
            val block = blocks.optJSONObject(i) ?: continue
            when (block.optString("type")) {
                "title" -> {
                    val paint = makePaint(context, "bold", TITLE_SIZE)
                    val layout = makeLayout(
                        block.optString("text"),
                        paint,
                        TEXT_WIDTH,
                        Layout.Alignment.ALIGN_CENTER,
                    )
                    ops.add(DrawOp.Text(layout, TITLE_MARGIN_BOTTOM))
                }

                "field" -> {
                    val label = block.optString("label")
                    val value = block.optString("value")
                    val ltr = block.optBoolean("ltr", false)
                    val combined = if (ltr) "$label: $LRE$value$PDF" else "$label: $value"
                    val paint = makePaint(context, "medium", FIELD_SIZE)
                    val layout = makeLayout(
                        combined,
                        paint,
                        TEXT_WIDTH,
                        Layout.Alignment.ALIGN_NORMAL,
                    )
                    ops.add(DrawOp.Text(layout, FIELD_MARGIN_BOTTOM))
                }

                "text" -> {
                    val label = block.optString("label", "")
                    if (label.isNotEmpty()) {
                        val labelPaint = makePaint(context, "medium", TEXT_SIZE)
                        val labelLayout = makeLayout(
                            "$label:",
                            labelPaint,
                            TEXT_WIDTH,
                            Layout.Alignment.ALIGN_NORMAL,
                        )
                        ops.add(DrawOp.Text(labelLayout, TEXT_LABEL_MARGIN_BOTTOM))
                    }
                    val bodyPaint = makePaint(context, "regular", TEXT_SIZE)
                    val bodyLayout = makeLayout(
                        block.optString("text"),
                        bodyPaint,
                        TEXT_WIDTH,
                        Layout.Alignment.ALIGN_NORMAL,
                        TEXT_LINE_SPACING_EXTRA,
                    )
                    ops.add(DrawOp.Text(bodyLayout, TEXT_BLOCK_MARGIN_BOTTOM))
                }

                "codeBox" -> {
                    val label = block.optString("label")
                    val value = "$LRE${block.optString("value")}$PDF"

                    val labelPaint = makePaint(context, "medium", CODE_BOX_LABEL_SIZE)
                    val labelLayout = makeLayout(
                        label,
                        labelPaint,
                        TEXT_WIDTH,
                        Layout.Alignment.ALIGN_NORMAL,
                    )

                    val valuePaint = makePaint(context, "bold", CODE_BOX_VALUE_SIZE)
                    valuePaint.letterSpacing = CODE_BOX_LETTER_SPACING
                    val valueWidth = TEXT_WIDTH - CODE_BOX_PADDING_H * 2
                    val valueLayout = makeLayout(
                        value,
                        valuePaint,
                        valueWidth,
                        Layout.Alignment.ALIGN_CENTER,
                    )

                    ops.add(DrawOp.CodeBox(labelLayout, valueLayout, TEXT_WIDTH, CODE_BOX_MARGIN_BOTTOM))
                }

                "separator" -> ops.add(DrawOp.Separator)
            }
        }
        return ops
    }

    private fun renderToBitmap(ops: List<DrawOp>): Bitmap {
        val contentHeight = ops.sumOf { it.height }
        val totalHeight = (contentHeight + PADDING_V * 2).coerceAtLeast(1)

        val bitmap = Bitmap.createBitmap(CONTENT_WIDTH, totalHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        val linePaint = Paint().apply {
            color = Color.BLACK
            style = Paint.Style.FILL
        }
        val boxBorderPaint = Paint().apply {
            color = Color.BLACK
            style = Paint.Style.STROKE
            strokeWidth = CODE_BOX_BORDER_WIDTH
            isAntiAlias = true
        }

        var y = PADDING_V
        for (op in ops) {
            when (op) {
                is DrawOp.Text -> {
                    canvas.save()
                    canvas.translate(PADDING_H.toFloat(), y.toFloat())
                    op.layout.draw(canvas)
                    canvas.restore()
                    y += op.layout.height + op.marginBottom
                }

                is DrawOp.Separator -> {
                    y += SEPARATOR_MARGIN
                    canvas.drawRect(
                        PADDING_H.toFloat(),
                        y.toFloat(),
                        (CONTENT_WIDTH - PADDING_H).toFloat(),
                        (y + SEPARATOR_THICKNESS).toFloat(),
                        linePaint,
                    )
                    y += SEPARATOR_THICKNESS + SEPARATOR_MARGIN
                }

                is DrawOp.CodeBox -> {
                    canvas.save()
                    canvas.translate(PADDING_H.toFloat(), y.toFloat())
                    op.labelLayout.draw(canvas)
                    canvas.restore()
                    y += op.labelLayout.height + CODE_BOX_LABEL_MARGIN_BOTTOM

                    val boxRect = RectF(
                        PADDING_H.toFloat(),
                        y.toFloat(),
                        (PADDING_H + op.boxWidth).toFloat(),
                        (y + op.boxHeight).toFloat(),
                    )
                    canvas.drawRoundRect(boxRect, CODE_BOX_RADIUS, CODE_BOX_RADIUS, boxBorderPaint)

                    canvas.save()
                    canvas.translate(
                        (PADDING_H + CODE_BOX_PADDING_H).toFloat(),
                        (y + CODE_BOX_PADDING_V).toFloat(),
                    )
                    op.valueLayout.draw(canvas)
                    canvas.restore()

                    y += op.boxHeight + op.marginBottom
                }
            }
        }

        return bitmap
    }

    // Flat 50% luminance threshold - matches thresholdToBilevel in
    // printUtils.js. Rendered text is already crisp black-on-white after
    // Canvas's own anti-aliasing, so dithering isn't worth its cost here
    // (see ImageRasterizer for card art, which does dither).
    private fun thresholdToBilevel(bitmap: Bitmap): BooleanArray {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        val result = BooleanArray(width * height)
        for (i in pixels.indices) {
            val pixel = pixels[i]
            val a = (pixel ushr 24) and 0xff
            if (a < 128) {
                result[i] = false
                continue
            }
            val r = (pixel ushr 16) and 0xff
            val g = (pixel ushr 8) and 0xff
            val b = pixel and 0xff
            val lum = r * 0.3f + g * 0.59f + b * 0.11f
            result[i] = lum < 128f
        }
        return result
    }

    fun renderBlocksToRasterBase64(context: Context, blocksJson: String): String? {
        val blocks = JSONArray(blocksJson)
        if (blocks.length() == 0) return null

        val ops = buildOps(context, blocks)
        if (ops.isEmpty()) return null

        val bitmap = renderToBitmap(ops)
        val pixels = thresholdToBilevel(bitmap)
        val raster = EscPosRaster.encode(bitmap.width, bitmap.height, pixels)
        bitmap.recycle()

        return android.util.Base64.encodeToString(raster, android.util.Base64.NO_WRAP)
    }
}
