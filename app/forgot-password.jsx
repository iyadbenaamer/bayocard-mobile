import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { BackHandler, Platform, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
import NeonButton from "../components/arcade/NeonButton";
import InputField from "../components/ui/InputField";
import PopupMessage from "../components/ui/PopupMessage";
import { FontFamily } from "../constants/fonts";
import { Radii } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import {
  checkPhoneForResetPassword,
  sendVerificationCode,
} from "../services/authApi";

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const { palette } = usePalette();
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const phoneRegex = /^09\d{8}$/;

  const showPopup = (message, type = "info") => {
    setPopup({ visible: true, message, type });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, visible: false }));
  };

  const getResetPhoneErrorMessage = (code) => {
    switch (code) {
      case "AUTH_PHONE_NOT_REGISTERED":
        return t("forgotPassword.phoneNotRegisteredError");
      case "AUTH_CODE_SENDING_DISABLED":
        return t("forgotPassword.codeSendingDisabledError");
      case "AUTH_RESET_RESEND_NOT_ALLOWED":
        return t("forgotPassword.resendNotAllowedError");
      default:
        return t("forgotPassword.genericError");
    }
  };

  const handleContinue = async () => {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      showPopup(t("forgotPassword.phoneRequired"), "warning");
      return;
    }
    if (!phoneRegex.test(normalizedPhone)) {
      showPopup(t("forgotPassword.phoneInvalid"), "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const availability = await checkPhoneForResetPassword(normalizedPhone);
      if (!availability?.success) {
        const message = getResetPhoneErrorMessage(availability?.code);
        showPopup(message, "warning");
        return;
      }

      const data = await sendVerificationCode({
        phone: normalizedPhone,
        type: "reset-password",
      });

      showPopup(t("forgotPassword.codeSentSuccess"), "success");
      setTimeout(() => {
        router.replace({
          pathname: "/verify-reset",
          params: { phone: normalizedPhone, resendAfter: data?.resendAfter },
        });
      }, 700);
    } catch (error) {
      const code = error?.response?.data?.code;
      const message = getResetPhoneErrorMessage(code);
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
              {t("forgotPassword.title")}
            </Text>
            <Text
              className="text-sm mb-5"
              style={{
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {t("forgotPassword.subtitle")}
            </Text>

            <InputField
              containerClassName="mb-4"
              label={t("forgotPassword.phoneLabel")}
              placeholder={t("forgotPassword.phonePlaceholder")}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              inputClassName="text-left"
            />

            <NeonButton
              label={
                isSubmitting
                  ? t("forgotPassword.continuingButton")
                  : t("forgotPassword.continueButton")
              }
              size="lg"
              full
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={handleContinue}
            />

            <NeonButton
              label={t("forgotPassword.backToLogin")}
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

export default ForgotPasswordScreen;
