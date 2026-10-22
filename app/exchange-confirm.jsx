import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import ScreenTitle from "../components/Title";
import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
import NeonButton from "../components/arcade/NeonButton";
import PopupMessage from "../components/ui/PopupMessage";
import { FontFamily } from "../constants/fonts";
import { Radii } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { sendExchange } from "../services/exchangeApi";

const formatAmount = (amount) => {
  const numeric = Number(amount) || 0;
  return new Intl.NumberFormat("ar", {
    numberingSystem: "latn",
    currency: "LYD",
    maximumFractionDigits: 2,
  }).format(numeric);
};

const SummaryRow = ({ label, value, palette, emphasize }) => (
  <View
    className="flex-row items-center justify-between mt-1.5 rounded-lg px-3 py-2"
    style={{ backgroundColor: palette.background }}
  >
    <Text
      className="text-xs"
      style={{ color: palette.icon, fontFamily: FontFamily.medium }}
    >
      {label}
    </Text>
    <Text
      className={emphasize ? "text-base" : "text-sm"}
      style={{
        color: palette.text,
        fontFamily: emphasize ? FontFamily.bold : FontFamily.medium,
      }}
    >
      {value}
    </Text>
  </View>
);

const ExchangeConfirm = () => {
  const router = useRouter();
  const { palette } = usePalette();
  const { t } = useTranslation();
  const {
    phone,
    amount,
    exchangeKey,
    recipientName,
    recipientPhone,
    feePercentage,
    fee,
    totalCharge,
  } = useLocalSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const showPopup = (message, type = "info") =>
    setPopup({ visible: true, message, type });
  const closePopup = () => setPopup((prev) => ({ ...prev, visible: false }));

  const feeAmount = Number(fee) || 0;
  const hasFee = feeAmount > 0;

  const getSendErrorMessage = (code) => {
    switch (code) {
      case "EXCHANGE_RECIPIENT_NOT_FOUND":
        return t("exchangeConfirm.errorRecipientNotFound");
      case "EXCHANGE_SELF_NOT_ALLOWED":
        return t("exchangeConfirm.errorSelfNotAllowed");
      case "EXCHANGE_RECIPIENT_INACTIVE":
        return t("exchangeConfirm.errorRecipientInactive");
      case "EXCHANGE_INDIVIDUAL_TO_BUSINESS_NOT_ALLOWED":
        return t("exchangeConfirm.errorIndividualToBusinessNotAllowed");
      case "EXCHANGE_AMOUNT_TOO_SMALL":
        return t("exchangeConfirm.errorAmountTooSmall");
      case "EXCHANGE_INSUFFICIENT_BALANCE":
        return t("exchangeConfirm.errorInsufficientBalance");
      case "EXCHANGE_IN_PROGRESS":
        return t("exchangeConfirm.errorInProgress");
      default:
        return t("exchangeConfirm.errorGeneric");
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await sendExchange({ phone, amount: Number(amount), exchangeKey });
      showPopup(t("exchangeConfirm.successMessage"), "success");
      setTimeout(() => router.replace("/(tabs)/transactions"), 900);
    } catch (error) {
      const code = error?.response?.data?.code;
      showPopup(getSendErrorMessage(code), "error");
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      >
        <View className="px-6 pt-6">
          <ScreenTitle back>{t("exchangeConfirm.title")}</ScreenTitle>

          <GlowCard
            radius={Radii.xl}
            intensity="strong"
            fill={palette.surfaceElevated}
            contentStyle={{ padding: 18 }}
            style={{ marginTop: 16 }}
          >
            <Text
              className="text-xs mb-2"
              style={{
                color: palette.textMuted,
                fontFamily: FontFamily.medium,
              }}
            >
              {t("exchangeConfirm.recipientLabel")}
            </Text>
            <Text
              className="text-lg mb-3"
              style={{ color: palette.text, fontFamily: FontFamily.bold }}
            >
              {recipientName} - {recipientPhone}
            </Text>

            <SummaryRow
              label={t("exchangeConfirm.amountLabel")}
              value={`${formatAmount(amount)} ${t("exchangeConfirm.currency")}`}
              palette={palette}
            />
            <SummaryRow
              label={
                feePercentage
                  ? t("exchangeConfirm.feeLabelWithPercentage", {
                      percentage: feePercentage,
                    })
                  : t("exchangeConfirm.feeLabel")
              }
              value={
                hasFee
                  ? `${formatAmount(feeAmount)} ${t("exchangeConfirm.currency")}`
                  : t("exchangeConfirm.noFee")
              }
              palette={palette}
            />
            <SummaryRow
              label={t("exchangeConfirm.totalChargedLabel")}
              value={`${formatAmount(totalCharge)} ${t("exchangeConfirm.currency")}`}
              palette={palette}
              emphasize
            />
          </GlowCard>

          <NeonButton
            label={
              isSubmitting
                ? t("exchangeConfirm.submitting")
                : t("exchangeConfirm.confirmButton")
            }
            size="lg"
            full
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleConfirm}
            style={{ marginTop: 24 }}
          />

          <NeonButton
            label={t("exchangeConfirm.backButton")}
            variant="outline"
            tone={palette.textMuted}
            size="lg"
            full
            disabled={isSubmitting}
            onPress={() => router.back()}
            style={{ marginTop: 12 }}
          />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default ExchangeConfirm;
