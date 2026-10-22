import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  BackHandler,
  Platform,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useDispatch } from "react-redux";

import InputField from "../components/ui/InputField";
import PopupMessage from "../components/ui/PopupMessage";
import { FontFamily } from "../constants/fonts";
import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
import NeonButton from "../components/arcade/NeonButton";
import PressableScale from "../components/arcade/Pressable";
import { Radii } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { resetPasswordByToken, verifyAccessToken } from "../services/authApi";
import { setAccessToken } from "../services/authStorage";
import { getUserById } from "../services/userApi";
import { setUser } from "../state/userSlice";

import EyeIcon from "../assets/icons/eye.svg";

const ResetPasswordScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { token } = useLocalSearchParams();
  const { palette } = usePalette();
  const { t, isRTL } = useTranslation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secure, setSecure] = useState(true);
  const [confirmSecure, setConfirmSecure] = useState(true);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const passwordRegex =
    /^(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,50}$/;

  const passwordValid = passwordRegex.test(password);
  const confirmValid =
    confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = passwordValid && confirmValid;

  const showPopup = (message, type = "info") => {
    setPopup({ visible: true, message, type });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, visible: false }));
  };

  const getResetPasswordErrorMessage = (code) => {
    switch (code) {
      case "AUTH_RESET_TOKEN_REQUIRED":
      case "AUTH_RESET_TOKEN_MISSING":
      case "AUTH_INVALID_RESET_TOKEN":
        return t("resetPassword.invalidTokenError");
      case "AUTH_PASSWORD_REQUIRED":
        return t("resetPassword.passwordRequiredError");
      case "AUTH_RESET_LINK_EXPIRED":
        return t("resetPassword.linkExpiredError");
      case "AUTH_DEVICE_ATTESTATION_FAILED":
        return t("resetPassword.deviceAttestationFailedError");
      case "AUTH_DEVICE_CHALLENGE_EXPIRED":
        return t("resetPassword.deviceChallengeExpiredError");
      case "AUTH_DEVICE_ATTESTATION_REQUIRED":
      case "AUTH_DEVICE_PLATFORM_UNSUPPORTED":
        return t("resetPassword.deviceVerificationFailedError");
      default:
        return t("resetPassword.genericError");
    }
  };

  const loadUserProfile = async () => {
    try {
      const session = await verifyAccessToken();
      if (!session?.id) {
        return;
      }
      const user = await getUserById(session.id);
      if (user) {
        dispatch(setUser(user));
      }
    } catch {
      // keep flow smooth even if profile fetch fails
    }
  };

  const handleResetPassword = async () => {
    if (!token) {
      showPopup(t("resetPassword.noTokenError"), "warning");
      return;
    }
    if (!password) {
      showPopup(t("resetPassword.passwordRequired"), "warning");
      return;
    }
    if (!passwordValid) {
      showPopup(t("resetPassword.passwordInvalid"), "warning");
      return;
    }
    if (!confirmPassword) {
      showPopup(t("resetPassword.confirmPasswordRequired"), "warning");
      return;
    }
    if (!confirmValid) {
      showPopup(t("resetPassword.passwordMismatch"), "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await resetPasswordByToken({
        token: String(token),
        password,
      });
      if (!data?.accessToken) {
        showPopup(t("resetPassword.genericError"), "error");
        return;
      }

      await setAccessToken(data.accessToken);
      await loadUserProfile();

      showPopup(t("resetPassword.resetSuccess"), "success");
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 800);
    } catch (error) {
      const code = error?.response?.data?.code;
      const message = getResetPasswordErrorMessage(code);
      const type = code ? "warning" : "error";
      showPopup(message, type);
    } finally {
      setIsSubmitting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (Platform.OS === "android") {
          router.replace("/login");
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [router]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop grid intensity={1.1} />
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      <KeyboardAwareScrollView
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <View className="px-6">
          <GlowCard
            radius={Radii.xl}
            intensity="strong"
            fill={palette.surfaceElevated}
            contentStyle={{ padding: 20 }}
          >
            <Text
              className="text-2xl mb-2"
              style={{ color: palette.text, fontFamily: FontFamily.bold }}
            >
              {t("resetPassword.title")}
            </Text>
            <Text
              className="text-sm mb-5"
              style={{
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {t("resetPassword.subtitle")}
            </Text>

            <InputField
              containerClassName="mb-4"
              label={t("resetPassword.newPasswordLabel")}
              inputClassName={isRTL ? "text-right" : "text-left"}
              disableKeyboardShortcuts
              inputMode="text"
              keyboardType="visible-password"
              textContentType="password"
              autoCapitalize="none"
              placeholder="••••••••"
              autoCorrect={false}
              secureTextEntry={secure}
              value={password}
              onChangeText={setPassword}
              rightAccessory={
                <PressableScale
                  onPress={() => setSecure(!secure)}
                  scaleTo={0.85}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    secure
                      ? t("resetPassword.showPasswordA11yLabel")
                      : t("resetPassword.hidePasswordA11yLabel")
                  }
                >
                  <EyeIcon
                    width={20}
                    height={20}
                    color={secure ? palette.textFaint : palette.accent}
                  />
                </PressableScale>
              }
            />
            <Text
              className="text-xs mb-3"
              style={{
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {t("resetPassword.passwordHint")}
            </Text>

            <InputField
              containerClassName="mb-4"
              label={t("resetPassword.confirmPasswordLabel")}
              inputClassName={isRTL ? "text-right" : "text-left"}
              disableKeyboardShortcuts
              inputMode="text"
              keyboardType="visible-password"
              textContentType="password"
              autoCapitalize="none"
              placeholder="••••••••"
              autoCorrect={false}
              secureTextEntry={confirmSecure}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              rightAccessory={
                <PressableScale
                  onPress={() => setConfirmSecure(!confirmSecure)}
                  scaleTo={0.85}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    confirmSecure
                      ? t("resetPassword.showPasswordA11yLabel")
                      : t("resetPassword.hidePasswordA11yLabel")
                  }
                >
                  <EyeIcon
                    width={20}
                    height={20}
                    color={confirmSecure ? palette.textFaint : palette.accent}
                  />
                </PressableScale>
              }
            />

            <NeonButton
              label={
                isSubmitting
                  ? t("resetPassword.savingButton")
                  : t("resetPassword.saveButton")
              }
              size="lg"
              full
              loading={isSubmitting}
              disabled={isSubmitting || !isFormValid}
              onPress={handleResetPassword}
            />

            <NeonButton
              label={t("resetPassword.backToLogin")}
              variant="ghost"
              tone={palette.accent}
              full
              disabled={isSubmitting}
              onPress={() => router.replace("/login")}
              style={{ marginTop: 4 }}
            />
          </GlowCard>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default ResetPasswordScreen;
