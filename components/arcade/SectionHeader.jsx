import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { Text, View } from "react-native";

import { FontFamily } from "../../constants/fonts";
import { Radii } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import PressableScale from "./Pressable";

/**
 * Section label with a gradient "energy bar" marker on the leading edge.
 * The marker is a plain gradient block rather than an icon so it works
 * identically in RTL - `flexDirection: row` already mirrors, and a bar has
 * no handedness to get wrong.
 */
export const SectionHeader = memo(
  ({ title, subtitle, actionLabel, onActionPress, style }) => {
    const { palette, gradients } = usePalette();

    return (
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          },
          style,
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
          }}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: 4, height: 22, borderRadius: Radii.pill }}
          />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: palette.text,
                fontFamily: FontFamily.bold,
                fontSize: 17,
                letterSpacing: 0.2,
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{
                  color: palette.textMuted,
                  fontFamily: FontFamily.regular,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {actionLabel && onActionPress ? (
          <PressableScale onPress={onActionPress} hitSlop={8}>
            <Text
              style={{
                color: palette.accent,
                fontFamily: FontFamily.medium,
                fontSize: 13,
              }}
            >
              {actionLabel}
            </Text>
          </PressableScale>
        ) : null}
      </View>
    );
  },
);

SectionHeader.displayName = "SectionHeader";

export default SectionHeader;
