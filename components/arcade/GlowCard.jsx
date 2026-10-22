import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Platform, View } from "react-native";

import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";

// Android draws a view's elevation shadow from its outline, in the parent,
// so clipping the view's own contents leaves the shadow intact and one view
// can carry both. iOS clips the shadow along with everything else once
// `overflow: hidden` sets masksToBounds, so there the shadow needs a host of
// its own and the fill has to be a separate child.
const CAN_CLIP_AND_CAST_SHADOW = Platform.OS === "android";

/**
 * The panel every surface in the app is built from: a hairline edge around a
 * solid fill, optionally blooming a coloured shadow.
 *
 * Two render paths, because this is the single most-instantiated component
 * in the app - every catalog tile, list row and settings row is one, so its
 * cost is multiplied by the length of the longest list on screen:
 *
 *   intensity="strong" - a real two-stop gradient hairline, drawn as a
 *     padded LinearGradient wrapping the fill (RN has no gradient border).
 *     That costs three native views plus a gradient, which is worth it for
 *     the one or two emphasised cards on a screen.
 *
 *   everything else - a flat 1px border, on a single view where the platform
 *     allows it. At hairline width the gradient's two stops are a fraction of
 *     a pixel apart and read as one colour anyway, so the wrapper view, the
 *     gradient node and the second rounded-corner clip bought nothing on the
 *     95% of cards using the default "soft" intensity. On Android - the POS
 *     hardware this app has to stay fast on - that is a 3:1 cut in the native
 *     view count of every list in the app.
 */
export const GlowCard = memo(
  ({
    children,
    radius = Radii.lg,
    tone,
    intensity = "soft",
    fill,
    style,
    contentStyle,
    borderWidth = 1,
    ...rest
  }) => {
    const { palette, isDark } = usePalette();
    const accent = tone ?? palette.primary;
    const background = fill ?? palette.surface;

    if (intensity === "strong") {
      return (
        <View
          style={[
            // The shadow host needs its own opaque background: Android builds
            // the elevation shadow from the view outline, and a transparent
            // host yields a squared-off halo around the rounded card.
            { borderRadius: radius, backgroundColor: background },
            style,
          ]}
          {...rest}
        >
          <LinearGradient
            colors={[withAlpha(accent, 0.9), withAlpha(palette.accentAlt, 0.5)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius, padding: borderWidth }}
          >
            <View
              style={[
                {
                  borderRadius: radius - borderWidth,
                  backgroundColor: background,
                  overflow: "hidden",
                },
                contentStyle,
              ]}
            >
              {children}
            </View>
          </LinearGradient>
        </View>
      );
    }

    const edge = {
      borderRadius: radius,
      backgroundColor: background,
      borderWidth,
      borderColor:
        intensity === "none"
          ? palette.border
          : withAlpha(accent, isDark ? 0.34 : 0.22),
    };

    const bloom =
      intensity === "none"
        ? null
        : glow(isDark ? "#000" : accent, {
            opacity: 0.35,
            radius: 14,
            y: 6,
            elevation: 5,
            isDark,
          });

    if (CAN_CLIP_AND_CAST_SHADOW) {
      return (
        <View
          style={[edge, { overflow: "hidden" }, bloom, style, contentStyle]}
          {...rest}
        >
          {children}
        </View>
      );
    }

    return (
      <View style={[edge, bloom, style]} {...rest}>
        <View
          style={[
            {
              // Pull the fill in under the border it sits inside, so the
              // clip follows the inner edge the way the border box does.
              borderRadius: radius - borderWidth,
              overflow: "hidden",
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    );
  },
);

GlowCard.displayName = "GlowCard";

export default GlowCard;
