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

import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
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
  verifyResetPasswordCode,
} from "../services/authApi";

const CODE_LENGTH = 6;

const VerifyResetPasswordScreen = () => {
  const router = useRouter();
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
    const nextCode = digitsOnly.slice(0, CODE_LENGTH);
    setCode(nextCode);
    setSelection({ start: nextCode.length, end: nextCode.length });
    if (isError) {
      setIsError(false);
    }
  };

  const getVerifyResetErrorMessage = (codeValue) => {
    switch (codeValue) {
      case "AUTH_USER_NOT_FOUND":
        return t("verifyReset.userNotFoundError");
      case "AUTH_RESET_TOKEN_MISSING":
        return t("verifyReset.resetTokenMissingError");
      case "AUTH_RESET_ATTEMPTS_EXCEEDED":
        return t("verifyReset.attemptsExceededError");
      case "AUTH_INVALID_CODE":
        return t("verifyReset.invalidCodeError");
      case "AUTH_RESET_CODE_EXPIRED":
        return t("verifyReset.codeExpiredError");
      case "AUTH_RESET_RESEND_NOT_ALLOWED":
        return t("verifyReset.resendNotAllowedError");
      case "AUTH_RESET_DAILY_LIMIT_REACHED":
        return t("verifyReset.dailyLimitError");
      case "AUTH_CODE_SENDING_DISABLED":
        return t("verifyReset.codeSendingDisabledError");
      default:
        return t("verifyReset.genericError");
    }
  };

  const handleVerify = async () => {
    if (!phone) {
      showPopup(t("verifyReset.phoneMissingError"), "warning");
      return;
    }
    if (code.length !== CODE_LENGTH) {
      setIsError(true);
      triggerShake();
      showPopup(t("verifyReset.codeLengthError"), "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await verifyResetPasswordCode({
        phone: String(phone),
        code,
      });
      if (!data?.token) {
        showPopup(t("verifyReset.genericError"), "error");
        return;
      }
      showPopup(t("verifyReset.verifySuccess"), "success");
      setTimeout(() => {
        router.replace({
          pathname: "/reset-password",
          params: { token: data.token, phone: String(phone) },
        });
      }, 700);
    } catch (error) {
      const serverCode = error?.response?.data?.code;
      const message = getVerifyResetErrorMessage(serverCode);
      const type = serverCode ? "warning" : "error";
      if (serverCode === "AUTH_INVALID_CODE") {
        setIsError(true);
        triggerShake();
      }
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
      showPopup(t("verifyReset.phoneMissingError"), "warning");
      return;
    }
    if (isCounting) {
      return;
    }

    setIsResending(true);
    try {
      const data = await sendVerificationCode({
        phone: String(phone),
        type: "reset-password",
      });
      startCountdown(data?.resendAfter);
      showPopup(t("verifyReset.resendSuccess"), "success");
    } catch (error) {
      const serverCode = error?.response?.data?.code;
      const message = getVerifyResetErrorMessage(serverCode);
      const type = serverCode ? "warning" : "error";
      const serverResendAfter = error?.response?.data?.resendAfter;
      if (serverResendAfter) {
        startCountdown(serverResendAfter);
      }
      showPopup(message, type);
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
            onPress={() => router.replace("/forgot-password")}
            scaleTo={0.95}
            hitSlop={8}
            style={{ alignSelf: "flex-end", marginBottom: 16 }}
          >
            <Text
              className="text-sm"
              style={{ color: palette.accent, fontFamily: FontFamily.medium }}
            >
              {t("verifyReset.backButton")}
            </Text>
          </PressableScale>

          <GlowCard
            radius={Radii.xl}
            intensity="strong"
            fill={palette.surfaceElevated}
            contentStyle={{ paddingVertical: 26, paddingHorizontal: 22 }}
          >
            <View className="items-center mb-2">
              <Text
                className="text-xl"
                style={{ color: palette.text, fontFamily: FontFamily.bold }}
              >
                {t("verifyReset.screenTitle")}
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
                ? t("verifyReset.codeSentToPhone", { phone: maskedPhone })
                : t("verifyReset.codeSentToYourPhone")}
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
                  const tone = isError
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
                  ? t("verifyReset.verifyingButton")
                  : t("verifyReset.confirmCodeButton")
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
                  ? t("verifyReset.resendingText")
                  : isCounting
                    ? t("verifyReset.resendCountdownText", {
                        time: formatCountdown(secondsLeft),
                      })
                    : t("verifyReset.resendButton")
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

export default VerifyResetPasswordScreen;
