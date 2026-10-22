import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Image, Platform, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useDispatch, useSelector } from "react-redux";

import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
import NeonButton from "../components/arcade/NeonButton";
import PressableScale from "../components/arcade/Pressable";
import InputField from "../components/ui/InputField";
import PopupMessage from "../components/ui/PopupMessage";
import { FontFamily } from "../constants/fonts";
import { Radii, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { login } from "../services/authApi";
import { getAccessToken, setAccessToken } from "../services/authStorage";
import {
  consumeSessionNotice,
  SESSION_NOTICE_SESSION_EVICTED,
  SESSION_NOTICE_SESSION_EXPIRED,
} from "../services/sessionManager";
import { selectUserProfile } from "../state/store";
import { setUser } from "../state/userSlice";
import { normalizeLocalPhoneNumber } from "../utils/phoneNumber";

import EyeIcon from "../assets/icons/eye.svg";
import LogoFull from "../assets/images/logo-full.png";

/** Neon on/off switch used for "remember me". */
const NeonSwitch = ({ value, onPress, disabled, accessibilityLabel }) => {
  const { palette, isDark } = usePalette();

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 48,
        height: 28,
        borderRadius: Radii.pill,
        padding: 3,
        justifyContent: "center",
        backgroundColor: value
          ? withAlpha(palette.accent, 0.9)
          : withAlpha(palette.borderStrong, isDark ? 0.9 : 1),
        borderWidth: 1,
        borderColor: value
          ? withAlpha(palette.accent, 0.6)
          : palette.borderStrong,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
          alignSelf: value ? "flex-end" : "flex-start",
        }}
      />
    </PressableScale>
  );
};

const LoginScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const profile = useSelector(selectUserProfile);
  const { palette } = usePalette();
  const { t, isRTL } = useTranslation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secure, setSecure] = useState(true);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    let isMounted = true;
    getAccessToken().then((token) => {
      if (isMounted && token) {
        if (profile?.isActive === false) {
          router.replace("/inactive");
        } else {
          router.replace("/(tabs)");
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [router, profile]);

  // From login, back should exit the app instead of going back to index (blank)
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (
          Platform.OS === "android" &&
          typeof BackHandler.exitApp === "function"
        ) {
          BackHandler.exitApp();
        }
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, []),
  );

  const showPopup = (message, type = "info") => {
    setPopup({ visible: true, message, type });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    const notice = consumeSessionNotice();
    if (notice?.type === SESSION_NOTICE_SESSION_EXPIRED) {
      showPopup(t("login.sessionExpiredNotice"), "error");
    } else if (notice?.type === SESSION_NOTICE_SESSION_EVICTED) {
      showPopup(t("login.sessionEvictedNotice"), "error");
    }
  }, []);

  const getLoginErrorMessage = (code) => {
    switch (code) {
      case "AUTH_INVALID_LOGIN":
        return t("login.invalidLoginError");
      case "AUTH_VERIFICATION_REQUIRED":
        return t("login.verificationRequiredError");
      case "AUTH_CODE_SENDING_DISABLED":
        return t("login.codeSendingDisabledError");
      case "AUTH_VERIFICATION_RESEND_NOT_ALLOWED":
        return t("login.verificationResendNotAllowedError");
      case "AUTH_VERIFICATION_DAILY_LIMIT_REACHED":
        return t("login.verificationDailyLimitError");
      case "AUTH_DEVICE_ATTESTATION_FAILED":
        return t("login.deviceAttestationFailedError");
      case "AUTH_DEVICE_CHALLENGE_EXPIRED":
        return t("login.deviceChallengeExpiredError");
      case "AUTH_DEVICE_ATTESTATION_REQUIRED":
      case "AUTH_DEVICE_PLATFORM_UNSUPPORTED":
        return t("login.deviceVerificationFailedError");
      default:
        return t("login.genericLoginError");
    }
  };

  // Any of these mean the account just needs phone verification - the user
  // should land on the verify screen (with whatever cooldown applies) rather
  // than being stuck on a login error popup.
  const VERIFICATION_BLOCKED_CODES = [
    "AUTH_VERIFICATION_REQUIRED",
    "AUTH_VERIFICATION_RESEND_NOT_ALLOWED",
    "AUTH_VERIFICATION_DAILY_LIMIT_REACHED",
  ];

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      showPopup(t("login.phoneAndPasswordRequired"), "warning");
      return;
    }

    const normalizedPhone = normalizeLocalPhoneNumber(phone.trim());
    setIsSubmitting(true);
    try {
      const data = await login({
        phone: normalizedPhone,
        password,
        rememberMe,
      });
      if (!data?.accessToken) {
        showPopup(t("login.genericLoginError"), "error");
        return;
      }
      await setAccessToken(data.accessToken);
      dispatch(setUser(data));
      if (data?.profile?.isActive === false) {
        router.replace("/inactive");
        return;
      }

      router.replace("/(tabs)");
    } catch (error) {
      const code = error?.response?.data?.code;
      const resendAfter = error?.response?.data?.resendAfter;
      const message = getLoginErrorMessage(code);
      const type = code ? "warning" : "error";
      showPopup(message, type);
      if (VERIFICATION_BLOCKED_CODES.includes(code)) {
        router.replace({
          pathname: "/verify",
          params: { phone: normalizedPhone, resendAfter },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {/* The grid only appears on the auth screens - it gives the entry
          point a distinct "console boot" feel without following the user
          into the shopping flow. */}
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
        <View style={{ paddingHorizontal: 24, zIndex: 1 }}>
          <View style={{ marginBottom: 22 }}>
            <View style={{ width: 320, height: 60, alignSelf: "center" }}>
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
              style={{
                marginTop: 10,
                fontSize: 30,
                color: palette.text,
                fontFamily: FontFamily.bold,
              }}
            >
              {t("login.title")}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 15,
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {t("login.subtitle")}
            </Text>
          </View>

          <GlowCard
            radius={Radii.xl}
            intensity="strong"
            fill={palette.surfaceElevated}
            contentStyle={{ padding: 20 }}
          >
            <InputField
              containerClassName="mb-4"
              label={t("login.phoneLabel")}
              placeholder={t("login.phonePlaceholder")}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              inputClassName="text-left"
            />

            <InputField
              containerClassName="mb-3"
              label={t("login.passwordLabel")}
              inputClassName={isRTL ? "text-right" : "text-left"}
              disableKeyboardShortcuts
              inputMode="text"
              keyboardType="visible-password"
              textContentType="password"
              autoCapitalize="none"
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
                      ? t("login.showPasswordA11yLabel")
                      : t("login.hidePasswordA11yLabel")
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

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: palette.text,
                  fontFamily: FontFamily.medium,
                }}
              >
                {t("login.rememberMe")}
              </Text>
              <NeonSwitch
                value={rememberMe}
                onPress={() => setRememberMe((prev) => !prev)}
                disabled={isSubmitting}
                accessibilityLabel={t("login.rememberMe")}
              />
            </View>

            <PressableScale
              onPress={() => router.replace("/forgot-password")}
              disabled={isSubmitting}
              scaleTo={0.97}
              hitSlop={6}
              style={{ alignSelf: "flex-start", marginTop: 12 }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: palette.accent,
                  fontFamily: FontFamily.medium,
                }}
              >
                {t("login.forgotPasswordLink")}
              </Text>
            </PressableScale>

            <NeonButton
              label={
                isSubmitting
                  ? t("login.loggingInButton")
                  : t("login.loginButton")
              }
              size="lg"
              full
              loading={isSubmitting}
              onPress={handleLogin}
              style={{ marginTop: 18 }}
            />

            <View
              style={{
                marginTop: 16,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: palette.textMuted,
                  fontFamily: FontFamily.regular,
                }}
              >
                {t("login.noAccountText")}{" "}
              </Text>
              <Link href="/signup" replace>
                <Text
                  style={{
                    fontSize: 13,
                    color: palette.accent,
                    fontFamily: FontFamily.bold,
                  }}
                >
                  {t("login.signupLink")}
                </Text>
              </Link>
            </View>
          </GlowCard>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default LoginScreen;
