import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { FontFamily } from "../../constants/fonts";
import { withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";

export const PASSWORD_RULES = [
  { key: "length", test: (v) => v.length >= 8 },
  { key: "digit", test: (v) => /\d/.test(v) },
  {
    key: "special",
    test: (v) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v),
  },
];

const PasswordRequirements = ({ password }) => {
  const { palette, isDark } = usePalette();
  const { t } = useTranslation();
  const value = password ?? "";

  return (
    <View className="mb-3 gap-1.5">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <View key={rule.key} className="flex-row items-center gap-2">
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: met ? 0 : 1,
                borderColor: withAlpha(palette.borderStrong, isDark ? 0.9 : 1),
                backgroundColor: met ? palette.success : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {met ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : null}
            </View>
            <Text
              className="text-sm"
              style={{
                color: met ? palette.success : palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {t(`passwordRequirements.${rule.key}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default PasswordRequirements;
