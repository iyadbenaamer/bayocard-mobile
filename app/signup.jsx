import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { BackHandler, Image, Platform, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import Chip from "../components/arcade/Chip";
import GlowCard from "../components/arcade/GlowCard";
import NeonButton from "../components/arcade/NeonButton";
import PressableScale from "../components/arcade/Pressable";
import CaptchaWidget from "../components/ui/CaptchaWidget";
import InputField from "../components/ui/InputField";
import PasswordRequirements, {
  PASSWORD_RULES,
} from "../components/ui/PasswordRequirements";
import PopupMessage from "../components/ui/PopupMessage";
import { FontFamily } from "../constants/fonts";
import { Radii, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { register } from "../services/authApi";
import {
  isValidLocalPhoneNumber,
  normalizeLocalPhoneNumber,
} from "../utils/phoneNumber";

import EyeIcon from "../assets/icons/eye.svg";
import LogoFull from "../assets/images/logo-full.png";
import LogoWhite from "../assets/images/logo-full.png";

const Signup = () => {
  const router = useRouter();
  const { palette, isDark } = usePalette();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("business");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secure, setSecure] = useState(true);
  const [confirmSecure, setConfirmSecure] = useState(true);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });
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

  const nameValid = name.trim().length >= 2;
  const phoneValid = isValidLocalPhoneNumber(phone.trim());
  const passwordValid = PASSWORD_RULES.every((rule) => rule.test(password));
  const confirmValid =
    confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid =
    nameValid &&
    phoneValid &&
    passwordValid &&
    confirmValid &&
    acceptedTerms &&
    Boolean(captchaToken);

  const showPopup = (message, type = "info") => {
    setPopup({ visible: true, message, type });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, visible: false }));
  };

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((prev) => prev + 1);
  };

  const getSignupErrorMessage = (code) => {
    switch (code) {
      case "AUTH_REQUIRED_FIELDS_MISSING":
        return t("signup.requiredFieldsMissingError");
      case "AUTH_INVALID_ROLE":
        return t("signup.invalidRoleError");
      case "AUTH_PHONE_ALREADY_REGISTERED":
        return t("signup.phoneAlreadyRegisteredError");
      case "AUTH_USERNAME_ALREADY_REGISTERED":
        return t("signup.usernameAlreadyRegisteredError");
      case "AUTH_CAPTCHA_REQUIRED":
      case "AUTH_CAPTCHA_INVALID":
        return t("signup.captchaError");
      case "AUTH_DEVICE_ATTESTATION_FAILED":
        return t("signup.deviceAttestationFailedError");
      case "AUTH_DEVICE_CHALLENGE_EXPIRED":
        return t("signup.deviceChallengeExpiredError");
      case "AUTH_DEVICE_ATTESTATION_REQUIRED":
      case "AUTH_DEVICE_PLATFORM_UNSUPPORTED":
        return t("signup.deviceVerificationFailedError");
      default:
        return t("signup.genericSignupError");
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      showPopup(t("signup.nameRequired"), "warning");
      return;
    }
    if (!nameValid) {
      showPopup(t("signup.nameTooShort"), "warning");
      return;
    }
    if (!phone.trim()) {
      showPopup(t("signup.phoneRequired"), "warning");
      return;
    }
    if (!phoneValid) {
      showPopup(t("signup.phoneInvalid"), "warning");
      return;
    }
    if (!password) {
      showPopup(t("signup.passwordRequired"), "warning");
      return;
    }
    if (!passwordValid) {
      showPopup(t("signup.passwordInvalid"), "warning");
      return;
    }
    if (!confirmPassword) {
      showPopup(t("signup.confirmPasswordRequired"), "warning");
      return;
    }
    if (!confirmValid) {
      showPopup(t("signup.passwordMismatch"), "warning");
      return;
    }
    if (!captchaToken) {
      showPopup(t("signup.captchaRequired"), "warning");
      return;
    }

    setIsSubmitting(true);
    const normalizedPhone = normalizeLocalPhoneNumber(phone.trim());
    try {
      const data = await register({
        name,
        phone: normalizedPhone,
        password,
        role,
        turnstileToken: captchaToken,
      });
      showPopup(t("signup.signupSuccess"), "success");
      setTimeout(() => {
        router.replace({
          pathname: "/verify",
          params: { phone: normalizedPhone, resendAfter: data?.resendAfter },
        });
      }, 800);
    } catch (error) {
      const code = error?.response?.data?.code;
      const message = getSignupErrorMessage(code);
      const type = code ? "warning" : "error";
      showPopup(message, type);
      resetCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      <AmbientBackdrop grid intensity={1.1} />
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={24}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingVertical: 24,
        }}
      >
        <View className="px-6 pb-6 gap-2" style={{ zIndex: 1 }}>
          <View className="px-6">
            <View className="mb-4">
              <View
                style={{
                  width: 280,
                  height: 50,
                  alignSelf: "center",
                  marginTop: 48,
                }}
              >
                <Image
                  source={LogoFull}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    resizeMode: "contain",
                  }}
                />
              </View>
              <Text
                className="text-3xl mt-2"
                style={{ color: palette.text, fontFamily: FontFamily.bold }}
              >
                {t("signup.title")}
              </Text>
              <Text
                className="text-base mt-1"
                style={{
                  color: palette.textMuted,
                  fontFamily: FontFamily.regular,
                }}
              >
                {t("signup.subtitle")}
              </Text>
            </View>
          </View>

          <View className="px-6 mb-2">
            <Text
              style={{ color: palette.text, fontFamily: FontFamily.medium }}
              className="mb-2 text-base"
            >
              {t("signup.accountTypeLabel")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Chip
                label={t("signup.businessRole")}
                active={role === "business"}
                onPress={() => setRole("business")}
              />
              <Chip
                label={t("signup.individualRole")}
                active={role === "individual"}
                onPress={() => setRole("individual")}
              />
            </View>
          </View>

          <GlowCard
            radius={Radii.xl}
            intensity="strong"
            fill={palette.surfaceElevated}
            contentStyle={{ padding: 20 }}
          >
            <InputField
              containerClassName="mb-4"
              label={t("signup.nameLabel")}
              placeholder={t("signup.namePlaceholder")}
              value={name}
              onChangeText={setName}
            />

            <InputField
              containerClassName="mb-4"
              label={t("signup.phoneLabel")}
              placeholder={t("signup.phonePlaceholder")}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />

            <InputField
              containerClassName="mb-2"
              inputStyle={{ writingDirection: "ltr" }}
              label={t("signup.passwordLabel")}
              inputClassName="text-left"
              disableKeyboardShortcuts
              inputMode="text"
              keyboardType="visible-password"
              textContentType="password"
              autoCapitalize="none"
              maxLength={50}
              autoCorrect={false}
              secureTextEntry={secure}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              rightAccessory={
                <PressableScale
                  onPress={() => setSecure(!secure)}
                  scaleTo={0.85}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    secure
                      ? t("signup.showPasswordA11yLabel")
                      : t("signup.hidePasswordA11yLabel")
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
            {passwordFocused || password.length > 0 ? (
              <PasswordRequirements password={password} />
            ) : null}

            <InputField
              containerClassName="mb-1"
              inputStyle={{ writingDirection: "ltr" }}
              label={t("signup.confirmPasswordLabel")}
              inputClassName="text-left"
              disableKeyboardShortcuts
              inputMode="text"
              keyboardType="visible-password"
              textContentType="password"
              autoCapitalize="none"
              maxLength={50}
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
                      ? t("signup.showPasswordA11yLabel")
                      : t("signup.hidePasswordA11yLabel")
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
            {confirmPassword.length > 0 ? (
              <Text
                className="text-sm mb-3"
                style={{
                  color: confirmValid ? palette.success : palette.danger,
                  fontFamily: FontFamily.regular,
                }}
              >
                {confirmValid
                  ? t("signup.passwordsMatch")
                  : t("signup.passwordsMismatch")}
              </Text>
            ) : (
              <View className="mb-4" />
            )}
            <View className="mb-2 flex-row items-start gap-3">
              <PressableScale
                onPress={() => setAcceptedTerms((prev) => !prev)}
                scaleTo={0.85}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
                accessibilityLabel={t("signup.acceptTermsA11yLabel")}
                style={{
                  marginTop: 2,
                  width: 24,
                  height: 24,
                  borderRadius: Radii.xs,
                  borderWidth: 1.5,
                  borderColor: acceptedTerms
                    ? palette.accent
                    : palette.borderStrong,
                  backgroundColor: acceptedTerms
                    ? withAlpha(palette.accent, 0.9)
                    : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: FontFamily.bold,
                    fontSize: 14,
                    lineHeight: 16,
                  }}
                >
                  {acceptedTerms ? "✓" : ""}
                </Text>
              </PressableScale>

              <View className="flex-1">
                <Text
                  className="text-sm"
                  style={{
                    color: palette.text,
                    fontFamily: FontFamily.regular,
                    lineHeight: 22,
                  }}
                >
                  {t("signup.agreeToTermsPrefix")}{" "}
                  <Link href="/terms-of-service" asChild>
                    <Text
                      style={{
                        color: palette.accent,
                        fontFamily: FontFamily.medium,
                        textDecorationLine: "underline",
                      }}
                    >
                      {t("signup.termsLink")}
                    </Text>
                  </Link>{" "}
                  {t("signup.andWord")}{" "}
                  <Link href="/privacy-policy" asChild>
                    <Text
                      style={{
                        color: palette.accent,
                        fontFamily: FontFamily.medium,
                        textDecorationLine: "underline",
                      }}
                    >
                      {t("signup.privacyLink")}
                    </Text>
                  </Link>
                  .
                </Text>
              </View>
            </View>

            <View className="mb-2 items-center">
              <CaptchaWidget
                key={captchaKey}
                onToken={setCaptchaToken}
                onExpire={resetCaptcha}
                onError={resetCaptcha}
              />
            </View>

            <NeonButton
              label={
                isSubmitting
                  ? t("signup.creatingAccountButton")
                  : t("signup.createAccountButton")
              }
              size="lg"
              full
              loading={isSubmitting}
              disabled={isSubmitting || !isFormValid}
              onPress={handleRegister}
              style={{ marginTop: 8 }}
            />

            <View className="mt-4 flex-row justify-center">
              <Text
                className="text-sm"
                style={{
                  color: palette.textMuted,
                  fontFamily: FontFamily.regular,
                }}
              >
                {t("signup.haveAccountText")}{" "}
              </Text>
              <Link href="/login" replace>
                <Text
                  className="text-sm"
                  style={{
                    color: palette.accent,
                    fontFamily: FontFamily.bold,
                  }}
                >
                  {t("signup.loginLink")}
                </Text>
              </Link>
            </View>
          </GlowCard>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default Signup;
