import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { FontFamily } from "../../constants/fonts";
import { Radii, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";

/**
 * Text field with a lit focus ring. The ring is the only focus affordance
 * these forms have (no floating labels, no helper text), so it carries a
 * full accent border rather than a subtle tint.
 */
const InputField = ({
  label,
  labelClassName,
  rightAccessory,
  containerClassName,
  inputClassName,
  inputStyle,
  onFocus,
  onBlur,
  ...inputProps
}) => {
  const { palette, isDark } = usePalette();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={containerClassName}>
      {label ? (
        <Text
          className={labelClassName ?? "text-base mb-2"}
          style={{
            color: isFocused ? palette.accent : palette.textMuted,
            fontFamily: FontFamily.medium,
            fontSize: 16,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderRadius: Radii.md,
          paddingHorizontal: 14,
          borderWidth: 1.5,
          borderColor: isFocused
            ? withAlpha(palette.accent, 0.85)
            : withAlpha(palette.borderStrong, isDark ? 0.9 : 1),
          backgroundColor: isDark ? palette.surfaceSunken : palette.surface,
        }}
      >
        <TextInput
          className={["flex-1 py-3 text-base", inputClassName]
            .filter(Boolean)
            .join(" ")}
          style={[
            {
              color: palette.text,
              fontFamily: FontFamily.regular,
            },
            inputStyle,
            { fontSize: 16 },
          ]}
          placeholderTextColor={palette.textFaint}
          selectionColor={palette.accent}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {rightAccessory ? rightAccessory : null}
      </View>
    </View>
  );
};

export default InputField;
