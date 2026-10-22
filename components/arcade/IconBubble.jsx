import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { View } from "react-native";

import { glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";

/**
 * Rounded-square container for an icon - the recurring "slot" motif used by
 * profile rows, wallet actions, and empty states. `variant="gradient"` makes
 * it a lit tile for the one thing that matters on a screen.
 */
export const IconBubble = memo(
  ({ children, size = 44, tone, variant = "tinted", radius, style }) => {
    const { palette, gradients, isDark } = usePalette();
    const accent = tone ?? palette.primary;
    const corner = radius ?? Math.round(size * 0.32);

    const inner = (
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    );

    if (variant === "gradient") {
      return (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            { borderRadius: corner, overflow: "hidden" },
            glow(accent, {
              opacity: 0.5,
              radius: 14,
              y: 6,
              elevation: 8,
              isDark,
            }),
            style,
          ]}
        >
          {inner}
        </LinearGradient>
      );
    }

    return (
      <View
        style={[
          {
            borderRadius: corner,
            backgroundColor: withAlpha(accent, isDark ? 0.16 : 0.1),
            borderWidth: 1,
            borderColor: withAlpha(accent, isDark ? 0.34 : 0.22),
          },
          style,
        ]}
      >
        {inner}
      </View>
    );
  },
);

IconBubble.displayName = "IconBubble";

export default IconBubble;
