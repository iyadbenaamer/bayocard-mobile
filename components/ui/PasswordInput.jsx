import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { FontFamily } from "../../constants/fonts";
import { Radii, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";

import ShowPasswordIcon from "../../assets/icons/eye.svg";
import HidePasswordIcon from "../../assets/icons/hide.svg";

const passwordRegex =
  /(?=.*\d)(?=.*[a-z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}/g;

const PasswordInput = ({
  label,
  name,
  value,
  onChange,
  confirmValue,
  onValidityChange,
  placeholder,
}) => {
  const { palette, isDark } = usePalette();
  const { t } = useTranslation();
  const [secure, setSecure] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState("");

  const currentValue = value ?? "";
  const currentConfirm = confirmValue ?? "";

  const isValid = useMemo(() => {
    if (!currentValue) {
      return false;
    }
    if (name === "password") {
      return passwordRegex.test(currentValue);
    }
    if (name === "confirmPassword") {
      return currentValue === currentConfirm && currentValue.length > 0;
    }
    return false;
  }, [currentConfirm, currentValue, name]);

  useEffect(() => {
    if (!currentValue) {
      setState("");
      setMessage("");
      onValidityChange?.(false);
      return;
    }

    if (name === "password") {
      if (isValid) {
        setState("success");
        setMessage("");
        onValidityChange?.(true);
        return;
      }
      setState("fail");
      setMessage(t("passwordInput.passwordRules"));
      onValidityChange?.(false);
      return;
    }

    if (name === "confirmPassword") {
      if (isValid) {
        setState("success");
        setMessage("");
        onValidityChange?.(true);
        return;
      }
      setState("fail");
      setMessage(t("passwordInput.passwordMismatch"));
      onValidityChange?.(false);
    }
  }, [currentValue, isValid, name, onValidityChange, t]);

  return (
    <View className="mb-3">
      {label ? (
        <Text
          className="text-base mb-2"
          style={{
            color: isFocused ? palette.accent : palette.textMuted,
            fontFamily: FontFamily.medium,
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
          // Validation tone wins over the focus ring: a red/green edge is
          // the answer to "did I type it right", which matters more than
          // "is the cursor here".
          borderColor:
            state === "fail"
              ? palette.danger
              : state === "success"
                ? palette.success
                : isFocused
                  ? withAlpha(palette.accent, 0.85)
                  : withAlpha(palette.borderStrong, isDark ? 0.9 : 1),
          backgroundColor: isDark ? palette.surfaceSunken : palette.surface,
        }}
      >
        <TextInput
          className="flex-1 py-3 text-base"
          style={{ color: palette.text, fontFamily: FontFamily.regular }}
          value={currentValue}
          onChangeText={(text) => onChange?.(text)}
          placeholder={placeholder}
          placeholderTextColor={palette.textFaint}
          selectionColor={palette.accent}
          secureTextEntry={secure}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <TouchableOpacity
          onPress={() => setSecure((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={
            secure ? t("passwordInput.showPassword") : t("passwordInput.hidePassword")
          }
        >
          {secure ? (
            <ShowPasswordIcon width={20} height={20} color={palette.textFaint} />
          ) : (
            <HidePasswordIcon width={20} height={20} color={palette.accent} />
          )}
        </TouchableOpacity>
      </View>
      <Text
        className="text-xs mt-1"
        style={{
          color: state === "fail" ? palette.danger : "transparent",
          fontFamily: FontFamily.regular,
        }}
      >
        {message || "-"}
      </Text>
    </View>
  );
};

export default PasswordInput;
