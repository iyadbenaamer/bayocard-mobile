import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Text, View } from "react-native";

import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import PressableScale from "./Pressable";

/** Pill filter/segment control. Active chips fill with the brand gradient. */
export const Chip = memo(({ label, active, onPress, icon, style }) => {
  const { palette, gradients, isDark } = usePalette();

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
      }}
    >
      {icon}
      <Text
        style={{
          color: active ? "#FFFFFF" : palette.textMuted,
          fontFamily: active ? FontFamily.bold : FontFamily.medium,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      style={[
        { borderRadius: Radii.pill },
        active
          ? glow(palette.primary, {
              opacity: 0.5,
              radius: 12,
              y: 4,
              elevation: 6,
              isDark,
            })
          : null,
        style,
      ]}
    >
      {active ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: Radii.pill, overflow: "hidden" }}
        >
          {body}
        </LinearGradient>
      ) : (
        <View
          style={{
            borderRadius: Radii.pill,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: withAlpha(palette.borderStrong, isDark ? 0.9 : 1),
            backgroundColor: palette.surface,
          }}
        >
          {body}
        </View>
      )}
    </PressableScale>
  );
});

Chip.displayName = "Chip";

export default Chip;
