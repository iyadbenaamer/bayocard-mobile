import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Platform,
  Pressable,
  Text,
  TextInput,
  Vibration,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useDispatch } from "react-redux";

import { Ionicons } from "@expo/vector-icons";

import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
import IconBubble from "../components/arcade/IconBubble";
import NeonButton from "../components/arcade/NeonButton";
import PressableScale from "../components/arcade/Pressable";
import PopupMessage from "../components/ui/PopupMessage";
import { FontFamily } from "../constants/fonts";
import { Radii, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import {
  formatCountdown,
  useResendCountdown,
} from "../hooks/use-resend-countdown";
import { useTranslation } from "../hooks/use-translation";
import {
  sendVerificationCode,
  verifyAccessToken,
  verifyAccountByCode,
} from "../services/authApi";
import { setAccessToken } from "../services/authStorage";
import { getUserById } from "../services/userApi";
import { setUser } from "../state/userSlice";

const CODE_LENGTH = 6;

const VerifyAccount = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { phone, resendAfter: initialResendAfter } = useLocalSearchParams();
  const { palette } = usePalette();
  const { t, isRTL } = useTranslation();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { secondsLeft, isCounting, startCountdown } = useResendCountdown(
    initialResendAfter,
  );
  const inputRef = useRef(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isError, setIsError] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const showPopup = (message, type = "info") => {
    setPopup({ visible: true, message, type });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, visible: false }));
  };

  const triggerShake = () => {
    Vibration.vibrate(150);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const maskedPhone = useMemo(() => {
    if (!phone) {
      return "";
    }
    const value = String(phone);
    if (value.length < 4) {
      return value;
    }
    return `${value.slice(-2)}****${value.slice(0, 3)}`;
  }, [phone]);

  const handleChangeCode = (value) => {
    const digitsOnly = value.replace(/\D/g, "");
    setCode(digitsOnly.slice(0, CODE_LENGTH));
    setSelection({ start: digitsOnly.length, end: digitsOnly.length });
    if (isError) {
      setIsError(false);
    }
  };

  const getVerifyErrorMessage = (codeValue) => {
    switch (codeValue) {
      case "INVALID_REQUEST":
      case "AUTH_VERIFICATION_TOKEN_MISSING":
        return t("verify.invalidRequestError");
      case "AUTH_USER_NOT_FOUND":
        return t("verify.userNotFoundError");
      case "AUTH_ALREADY_VERIFIED":
        return t("verify.alreadyVerifiedError");
      case "AUTH_VERIFICATION_ATTEMPTS_EXCEEDED":
        return t("verify.attemptsExceededError");
      case "AUTH_INVALID_CODE":
        return t("verify.invalidCodeError");
      case "AUTH_VERIFICATION_TOKEN_EXPIRED":
        return t("verify.tokenExpiredError");
      case "AUTH_DEVICE_ATTESTATION_FAILED":
        return t("verify.deviceAttestationFailedError");
      case "AUTH_DEVICE_CHALLENGE_EXPIRED":
        return t("verify.deviceChallengeExpiredError");
      case "AUTH_DEVICE_ATTESTATION_REQUIRED":
      case "AUTH_DEVICE_PLATFORM_UNSUPPORTED":
        return t("verify.deviceVerificationFailedError");
      default:
        return t("verify.genericVerifyError");
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
      // keep verification flow smooth even if profile fetch fails
    }
  };

  const handleVerify = async () => {
    if (!phone) {
      showPopup(t("verify.phoneMissingError"), "warning");
      return;
    }
    if (code.length !== CODE_LENGTH) {
      setIsError(true);
      triggerShake();
      showPopup(t("verify.codeLengthError"), "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await verifyAccountByCode({ phone, code });
      if (!data?.accessToken) {
        showPopup(t("verify.genericVerifyError"), "error");
        return;
      }
      await setAccessToken(data.accessToken);
      await loadUserProfile();
      setIsVerified(true);
      showPopup(t("verify.verifySuccess"), "success");
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 900);
    } catch (error) {
      const serverCode = error?.response?.data?.code;
      const message = getVerifyErrorMessage(serverCode);
      const type = serverCode ? "warning" : "error";
      if (serverCode === "AUTH_INVALID_CODE") {
        setIsError(true);
        triggerShake();
      }
      // Keep the countdown in sync with the server's real cooldown, e.g. if
      // attempts just ran out or the app was backgrounded for a while.
      const serverResendAfter = error?.response?.data?.resendAfter;
      if (serverResendAfter) {
        startCountdown(serverResendAfter);
      }
      showPopup(message, type);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!phone) {
      showPopup(t("verify.phoneMissingError"), "warning");
      return;
    }
    if (isCounting) {
      return;
    }
    setIsResending(true);
    try {
      const data = await sendVerificationCode({
        phone,
        type: "verify-account",
      });
      startCountdown(data?.resendAfter);
      showPopup(t("verify.resendSuccess"), "success");
    } catch (error) {
      const serverCode = error?.response?.data?.code;
      const serverResendAfter = error?.response?.data?.resendAfter;
      if (serverResendAfter) {
        startCountdown(serverResendAfter);
      }
      if (serverCode === "AUTH_VERIFICATION_DAILY_LIMIT_REACHED") {
        showPopup(t("verify.resendDailyLimitError"), "warning");
      } else if (serverCode === "AUTH_VERIFICATION_RESEND_NOT_ALLOWED") {
        showPopup(t("verify.resendNotAllowedError"), "warning");
      } else if (serverCode === "AUTH_CODE_SENDING_DISABLED") {
        showPopup(t("verify.resendDisabledError"), "warning");
      } else {
        showPopup(t("verify.resendFailedError"), "error");
      }
    } finally {
      setIsResending(false);
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
          <PressableScale
            onPress={() => router.replace("/login")}
            scaleTo={0.95}
            hitSlop={8}
            style={{ alignSelf: "flex-end", marginBottom: 16 }}
          >
            <Text
              className="text-sm"
              style={{ color: palette.accent, fontFamily: FontFamily.medium }}
            >
              {t("verify.backToLogin")}
            </Text>
          </PressableScale>
          <GlowCard
            radius={Radii.xl}
            intensity="strong"
            fill={palette.surfaceElevated}
            contentStyle={{ paddingVertical: 26, paddingHorizontal: 22 }}
          >
            <IconBubble
              size={76}
              radius={Radii.xl}
              variant="gradient"
              style={{ alignSelf: "center", marginBottom: 18 }}
            >
              <Ionicons
                name="shield-checkmark"
                size={34}
                color="#FFFFFF"
              />
            </IconBubble>
            <View className="items-center mb-2">
              <Text
                className="text-xl"
                style={{ color: palette.text, fontFamily: FontFamily.bold }}
              >
                {t("verify.screenTitle")}
              </Text>
            </View>
            <Text
              className="mt-2 text-center"
              style={{
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {maskedPhone
                ? t("verify.codeSentToPhone", { phone: maskedPhone })
                : t("verify.codeSentToYourPhone")}
            </Text>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={{
                  marginTop: 18,
                  marginBottom: 18,
                  // Digits should always read left-to-right, in either
                  // language - "row" already renders left-to-right once
                  // isRTL is false, but needs reversing to cancel out RN's
                  // automatic RTL row-mirroring when isRTL is true.
                  flexDirection: isRTL ? "row-reverse" : "row",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                  const digit = code[index] ?? "";
                  // The slot the next keystroke will fill gets the lit ring,
                  // so the caret is visible even though the real input is
                  // rendered off-screen.
                  const isActive = index === code.length;
                  const tone = isVerified
                    ? palette.success
                    : isError
                      ? palette.danger
                      : isActive || digit
                        ? palette.accent
                        : palette.borderStrong;
                  return (
                    <View
                      key={`digit-${index}`}
                      style={{
                        flex: 1,
                        minWidth: 34,
                        height: 54,
                        borderRadius: Radii.sm,
                        borderWidth: isActive || digit ? 1.5 : 1,
                        borderColor: withAlpha(tone, isActive ? 0.95 : 0.6),
                        backgroundColor: withAlpha(tone, 0.08),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: palette.text,
                          fontFamily: FontFamily.bold,
                          fontSize: 20,
                        }}
                      >
                        {digit}
                      </Text>
                    </View>
                  );
                })}
                <TextInput
                  ref={inputRef}
                  value={code}
                  onChangeText={handleChangeCode}
                  onFocus={() =>
                    setSelection({ start: code.length, end: code.length })
                  }
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={CODE_LENGTH}
                  autoFocus
                  selection={selection}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    width: "100%",
                    writingDirection: "ltr",
                    textAlign: "left",
                  }}
                />
              </Pressable>
            </Animated.View>

            <NeonButton
              label={
                isSubmitting
                  ? t("verify.verifyingButton")
                  : t("verify.confirmCodeButton")
              }
              size="lg"
              full
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={handleVerify}
            />

            <NeonButton
              label={
                isResending
                  ? t("verify.resendingText")
                  : isCounting
                    ? t("verify.resendCountdownText", {
                        time: formatCountdown(secondsLeft),
                      })
                    : t("verify.resendButton")
              }
              variant="ghost"
              tone={isCounting ? palette.textMuted : palette.accent}
              full
              disabled={isResending || isCounting}
              onPress={handleResend}
              style={{ marginTop: 4 }}
            />
          </GlowCard>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default VerifyAccount;
