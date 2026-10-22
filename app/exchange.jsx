import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import ScreenTitle from "../components/Title";
import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
import NeonButton from "../components/arcade/NeonButton";
import InputField from "../components/ui/InputField";
import PopupMessage from "../components/ui/PopupMessage";
import { Radii } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { previewExchange } from "../services/exchangeApi";
import generateUuid from "../utils/generateUuid";
import {
  isValidLocalPhoneNumber,
  normalizeLocalPhoneNumber,
} from "../utils/phoneNumber";

const Exchange = () => {
  const router = useRouter();
  const { palette } = usePalette();
  const { t } = useTranslation();

  const getPreviewErrorMessage = (code) => {
    switch (code) {
      case "EXCHANGE_RECIPIENT_NOT_FOUND":
        return t("exchange.errorRecipientNotFound");
      case "EXCHANGE_SELF_NOT_ALLOWED":
        return t("exchange.errorSelfNotAllowed");
      case "EXCHANGE_RECIPIENT_INACTIVE":
        return t("exchange.errorRecipientInactive");
      case "EXCHANGE_INDIVIDUAL_TO_BUSINESS_NOT_ALLOWED":
        return t("exchange.errorIndividualToBusinessNotAllowed");
      case "CHECK_INVALID_PHONE":
        return t("exchange.errorInvalidPhone");
      default:
        return t("exchange.errorGeneric");
    }
  };

  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const showPopup = (message, type = "info") =>
    setPopup({ visible: true, message, type });
  const closePopup = () => setPopup((prev) => ({ ...prev, visible: false }));

  const handleSubmit = async () => {
    const normalizedPhone = normalizeLocalPhoneNumber(phone.trim());
    if (!isValidLocalPhoneNumber(phone.trim())) {
      showPopup(t("exchange.validationPhoneInvalid"), "warning");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showPopup(t("exchange.validationAmountInvalid"), "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const preview = await previewExchange({
        phone: normalizedPhone,
        amount: parsedAmount,
      });
      router.push({
        pathname: "/exchange-confirm",
        params: {
          phone: normalizedPhone,
          amount: parsedAmount,
          exchangeKey: generateUuid(),
          recipientName: preview.recipient.name,
          recipientPhone: preview.recipient.phone,
          feePercentage: preview.feePercentage,
          fee: preview.fee,
          totalCharge: preview.totalCharge,
        },
      });
    } catch (error) {
      const code = error?.response?.data?.code;
      showPopup(getPreviewErrorMessage(code), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      <KeyboardAwareScrollView
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      >
        <View className="px-6 pt-6">
          <ScreenTitle back>{t("exchange.title")}</ScreenTitle>

          <GlowCard
            radius={Radii.xl}
            intensity="strong"
            fill={palette.surfaceElevated}
            contentStyle={{ padding: 18 }}
            style={{ marginTop: 16 }}
          >
            <InputField
              label={t("exchange.recipientPhoneLabel")}
              containerClassName="mb-4"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder={t("exchange.recipientPhonePlaceholder")}
            />
            <InputField
              label={t("exchange.amountLabel")}
              containerClassName="mb-4"
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder={t("exchange.amountPlaceholder")}
            />

            <NeonButton
              label={
                isSubmitting
                  ? t("exchange.submitting")
                  : t("exchange.continueButton")
              }
              size="lg"
              full
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={handleSubmit}
            />
          </GlowCard>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default Exchange;
