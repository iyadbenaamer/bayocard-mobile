import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Text, View } from "react-native";

import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";

/**
 * Small status pill. `gradient` turns it into a solid attention-grabber
 * (discounts, "new"); without it the badge is a tinted wash of `tone`, which
 * is quieter and works for the many neutral states in lists.
 */
export const Badge = memo(
  ({ label, icon, tone, gradient, style, textStyle }) => {
    const { palette, isDark } = usePalette();
    const accent = tone ?? palette.primary;

    const body = (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        {icon}
        <Text
          style={[
            {
              color: gradient ? "#FFFFFF" : accent,
              fontFamily: FontFamily.bold,
              fontSize: 11,
              letterSpacing: 0.3,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    );

    if (gradient) {
      // Android derives the elevation shadow from the view outline, so a
      // translucent gradient (the white washes used over artwork) would show
      // it straight through as a pale halo. Only opaque badges get the bloom.
      const isOpaque = gradient.every(
        (stop) => typeof stop === "string" && !stop.startsWith("rgba"),
      );

      return (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            { borderRadius: Radii.pill, overflow: "hidden" },
            isOpaque
              ? glow(accent, {
                  opacity: 0.5,
                  radius: 10,
                  y: 3,
                  elevation: 5,
                  isDark,
                })
              : null,
            style,
          ]}
        >
          {body}
        </LinearGradient>
      );
    }

    return (
      <View
        style={[
          {
            borderRadius: Radii.pill,
            overflow: "hidden",
            backgroundColor: withAlpha(accent, isDark ? 0.18 : 0.12),
            borderWidth: 1,
            borderColor: withAlpha(accent, 0.35),
          },
          style,
        ]}
      >
        {body}
      </View>
    );
  },
);

Badge.displayName = "Badge";

export default Badge;
