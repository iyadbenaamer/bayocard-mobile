import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import PressableScale from "./Pressable";

const SIZES = {
  sm: { height: 38, paddingHorizontal: 14, fontSize: 13, radius: Radii.sm },
  md: { height: 48, paddingHorizontal: 18, fontSize: 15, radius: Radii.md },
  lg: { height: 56, paddingHorizontal: 22, fontSize: 17, radius: Radii.lg },
};

/**
 * Primary call-to-action. `variant` picks how loud it is:
 *   solid   - gradient fill + bloom, for the one main action on a screen
 *   outline - neon hairline on glass, for secondary actions
 *   ghost   - text only, for tertiary/destructive rows
 */
export const NeonButton = memo(
  ({
    label,
    onPress,
    icon,
    trailingIcon,
    variant = "solid",
    size = "md",
    gradient,
    tone,
    loading = false,
    disabled = false,
    full = false,
    style,
    textStyle,
    ...rest
  }) => {
    const { palette, gradients, isDark } = usePalette();
    const metrics = SIZES[size] ?? SIZES.md;
    const accent = tone ?? palette.primary;
    const isSolid = variant === "solid";

    const labelColor = isSolid ? "#FFFFFF" : accent;

    const content = (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: metrics.height,
          paddingHorizontal: metrics.paddingHorizontal,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <>
            {icon}
            {label ? (
              <Text
                numberOfLines={1}
                style={[
                  {
                    color: labelColor,
                    fontFamily: FontFamily.bold,
                    fontSize: metrics.fontSize,
                    letterSpacing: 0.2,
                  },
                  textStyle,
                ]}
              >
                {label}
              </Text>
            ) : null}
            {trailingIcon}
          </>
        )}
      </View>
    );

    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          full ? { alignSelf: "stretch" } : null,
          { borderRadius: metrics.radius },
          isSolid
            ? glow(accent, {
                opacity: 0.55,
                radius: 18,
                y: 8,
                elevation: 10,
                isDark,
              })
            : null,
          style,
        ]}
        {...rest}
      >
        {isSolid ? (
          <LinearGradient
            colors={gradient ?? gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: metrics.radius, overflow: "hidden" }}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={{
              borderRadius: metrics.radius,
              overflow: "hidden",
              borderWidth: variant === "outline" ? 1.5 : 0,
              borderColor: withAlpha(accent, 0.65),
              backgroundColor:
                variant === "outline"
                  ? withAlpha(accent, isDark ? 0.14 : 0.08)
                  : "transparent",
            }}
          >
            {content}
          </View>
        )}
      </PressableScale>
    );
  },
);

NeonButton.displayName = "NeonButton";

export default NeonButton;
