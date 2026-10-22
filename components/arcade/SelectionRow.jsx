import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Text, View } from "react-native";

import { FontFamily } from "../../constants/fonts";
import { Radii, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import GlowCard from "./GlowCard";
import PressableScale from "./Pressable";

/**
 * Single-choice row for the settings pickers (theme, language). The selected
 * state is carried by both the card edge and a filled check, so it reads
 * without relying on colour alone.
 */
export const SelectionRow = memo(
  ({ label, description, selected, onPress }) => {
    const { palette, isDark } = usePalette();

    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.98}
        accessibilityRole="radio"
        accessibilityState={{ selected: Boolean(selected) }}
        accessibilityLabel={label}
      >
        <GlowCard
          radius={Radii.md}
          tone={selected ? palette.accent : palette.border}
          intensity={selected ? "strong" : "soft"}
          contentStyle={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                color: palette.text,
                fontFamily: selected ? FontFamily.bold : FontFamily.medium,
              }}
            >
              {label}
            </Text>
            {description ? (
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  color: palette.textMuted,
                  fontFamily: FontFamily.regular,
                }}
              >
                {description}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: selected
                ? palette.accent
                : withAlpha(palette.borderStrong, isDark ? 0.9 : 1),
              backgroundColor: selected ? palette.accent : "transparent",
            }}
          >
            {selected ? (
              <Ionicons name="checkmark" size={14} color={palette.onAccent} />
            ) : null}
          </View>
        </GlowCard>
      </PressableScale>
    );
  },
);

SelectionRow.displayName = "SelectionRow";

export default SelectionRow;
