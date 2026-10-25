import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenTitle from "../components/Title";
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
import { getPaymentMethods, openTopup } from "../services/walletApi";

const resolveImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("/")) {
    return `${process.env.EXPO_PUBLIC_API_URL}${path}`;
  }
  return path;
};

const WalletTopup = () => {
  const router = useRouter();
  const { palette, isDark } = usePalette();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [methods, setMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [amount, setAmount] = useState("");
  const [amountAfterFee, setAmountAfterFee] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const showPopup = (message, type = "info") =>
    setPopup({ visible: true, message, type });
  const closePopup = () => setPopup((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    const load = async () => {
      setIsLoadingMethods(true);
      try {
        const data = await getPaymentMethods();
        const list = Array.isArray(data?.paymentMethods)
          ? data.paymentMethods
          : [];
        setMethods(list);
        if (list.length > 0) {
          setSelectedId(list[0]._id);
        }
      } catch {
        showPopup(t("walletTopup.errorLoadMethods"), "error");
      } finally {
        setIsLoadingMethods(false);
      }
    };
    load();
  }, []);

  const selectedMethod = useMemo(
    () => methods.find((method) => method._id === selectedId) || null,
    [methods, selectedId],
  );
  const feeRate = useMemo(() => {
    if (!selectedMethod || selectedMethod.fee == null) return 0;
    const value = Number(selectedMethod.fee);
    return Number.isFinite(value) ? value : 0;
  }, [selectedMethod]);
  const hasFee = feeRate > 0;
  const normalizeAmountText = (value) => {
    if (value === "") return "";

    const sanitized = value.replace(/[^\d.]/g, "");
    if (!sanitized) return "";

    const parts = sanitized.split(".");
    const [wholePart, ...fractionParts] = parts;
    const fraction = fractionParts.join("").slice(0, 2);
    const hasDecimal = sanitized.includes(".");

    if (!hasDecimal) {
      return wholePart || "0";
    }

    const normalizedWhole = wholePart || "0";
    return fraction.length === 0
      ? `${normalizedWhole}.`
      : `${normalizedWhole}.${fraction}`;
  };
  const truncateToTwoDecimals = (value) => {
    if (!Number.isFinite(value)) return value;
    const floated = Number(value);
    return Math.trunc(floated * 100) / 100;
  };
  const formatComputedValue = (rawValue, computedValue) => {
    if (rawValue === "" || rawValue == null) return "";
    const value = truncateToTwoDecimals(computedValue);
    if (Number.isInteger(value)) {
      return String(value);
    }
    return String(value);
  };

  useEffect(() => {
    setAmount("");
    setAmountAfterFee("");
  }, [selectedId]);

  const syncAmounts = (field, rawValue) => {
    const normalizedValue = normalizeAmountText(rawValue);

    if (normalizedValue === "") {
      if (field === "amount") {
        setAmount("");
        setAmountAfterFee("");
      } else setAmountAfterFee("");
      return;
    }

    const nextValue = Number(normalizedValue);
    if (!Number.isFinite(nextValue) || nextValue < 0) {
      return;
    }

    if (!hasFee) {
      if (field === "amount") setAmount(normalizedValue);
      else setAmountAfterFee(normalizedValue);
      return;
    }

    if (field === "amount") {
      setAmount(normalizedValue);
      setAmountAfterFee(
        formatComputedValue(normalizedValue, nextValue * (1 - feeRate)),
      );
      return;
    }

    setAmountAfterFee(normalizedValue);
    setAmount(formatComputedValue(normalizedValue, nextValue / (1 - feeRate)));
  };

  // A method can turn its amount field off (amountEnabled === false); the
  // server then charges its fixedAmount and the app asks the user nothing.
  const amountEnabled = selectedMethod
    ? selectedMethod.amountEnabled !== false
    : true;

  const handleSubmit = async () => {
    if (!selectedMethod) {
      showPopup(t("walletTopup.validationSelectMethod"), "warning");
      return;
    }

    const requestBody = { paymentMethodId: selectedMethod._id };

    if (amountEnabled) {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        showPopup(t("walletTopup.validationAmountInvalid"), "warning");
        return;
      }
      if (
        parsedAmount < selectedMethod.minDeposit ||
        (selectedMethod.maxDeposit != null &&
          parsedAmount > selectedMethod.maxDeposit)
      ) {
        const rangeValues =
          selectedMethod.maxDeposit == null
            ? { min: selectedMethod.minDeposit }
            : {
                min: selectedMethod.minDeposit,
                max: selectedMethod.maxDeposit,
              };
        showPopup(
          t(
            selectedMethod.maxDeposit == null
              ? "walletTopup.amountMinimumTemplate"
              : "walletTopup.amountOutOfRangeTemplate",
            rangeValues,
          ),
          "warning",
        );
        return;
      }
      requestBody.amount = parsedAmount;
    }

    setIsSubmitting(true);
    try {
      const payment = await openTopup(requestBody);

      router.push({
        pathname: "/wallet-topup-webview",
        params: {
          paymentUrl: payment.paymentUrl,
          paymentRef: payment.paymentRef,
        },
      });
    } catch (error) {
      const code = error?.response?.data?.code;
      const dailyLimitError = error?.response?.data;
      const message =
        code === "WALLET_TOPUP_METHOD_UNAVAILABLE"
          ? t("walletTopup.errorMethodUnavailable")
          : code === "WALLET_TOPUP_AMOUNT_OUT_OF_RANGE"
            ? t("walletTopup.errorAmountOutOfRange")
            : code === "WALLET_TOPUP_DAILY_LIMIT_EXCEEDED"
              ? t("walletTopup.errorDailyLimitExceeded", {
                  remaining: dailyLimitError?.remainingDailyLimit ?? 0,
                })
              : code === "WALLET_TOPUP_GATEWAY_ERROR"
                ? t("walletTopup.errorGatewayError")
                : t("walletTopup.errorGeneric");
      showPopup(message, "error");
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

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
        <View style={{ flexShrink: 0 }}>
          <ScreenTitle back>{t("walletTopup.title")}</ScreenTitle>
        </View>

        {isLoadingMethods ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : methods.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text
              style={{
                textAlign: "center",
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {t("walletTopup.noMethodsAvailable")}
            </Text>
          </View>
        ) : (
          <>
            <View style={{ flexShrink: 0 }}>
              {selectedMethod ? (
                <View style={{ marginTop: 16 }}>
                  {selectedMethod.note ? (
                    <View
                      style={{
                        marginBottom: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: withAlpha(palette.accent, 0.4),
                        backgroundColor: withAlpha(palette.accent, 0.08),
                      }}
                    >
                      <Text
                        style={{
                          color: palette.text,
                          fontFamily: FontFamily.medium,
                          fontSize: 13,
                          lineHeight: 18,
                        }}
                      >
                        {selectedMethod.note}
                      </Text>
                    </View>
                  ) : null}
                  {hasFee ? (
                    <Text
                      style={{
                        marginBottom: 8,
                        color: palette.accent,
                        fontFamily: FontFamily.medium,
                        fontSize: 12,
                      }}
                    >
                      {t("walletTopup.feeLabelTemplate", {
                        fee: (feeRate * 100).toFixed(2),
                      })}
                    </Text>
                  ) : null}
                  {amountEnabled ? (
                    <>
                      <InputField
                        label={t(
                          selectedMethod.maxDeposit == null
                            ? "walletTopup.amountMinimumLabelTemplate"
                            : "walletTopup.amountLabelTemplate",
                          selectedMethod.maxDeposit == null
                            ? { min: selectedMethod.minDeposit }
                            : {
                                min: selectedMethod.minDeposit,
                                max: selectedMethod.maxDeposit,
                              },
                        )}
                        containerClassName="mb-3"
                        value={amount}
                        onChangeText={(text) => syncAmounts("amount", text)}
                        keyboardType="number-pad"
                        placeholder={t("walletTopup.amountPlaceholder")}
                      />
                      {hasFee ? (
                        <View style={{ marginBottom: 12 }}>
                          <Text
                            style={{
                              marginBottom: 6,
                              color: palette.textMuted,
                              fontFamily: FontFamily.medium,
                              fontSize: 12,
                            }}
                          >
                            {t("walletTopup.amountAfterFeeLabel")}
                          </Text>
                          <Text
                            style={{
                              color: palette.text,
                              fontFamily: FontFamily.medium,
                              fontSize: 16,
                            }}
                          >
                            {amountAfterFee
                              ? `${amountAfterFee} د.ل.`
                              : "0.00 د.ل."}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text
                      style={{
                        marginBottom: 8,
                        color: palette.text,
                        fontFamily: FontFamily.medium,
                      }}
                    >
                      {t("walletTopup.fixedAmountLabelTemplate", {
                        amount: selectedMethod.fixedAmount,
                      })}
                    </Text>
                  )}
                </View>
              ) : null}
            </View>

            <View style={{ flex: 1, marginTop: 16 }}>
              <Text
                style={{
                  marginBottom: 10,
                  fontSize: 14,
                  color: palette.textMuted,
                  fontFamily: FontFamily.medium,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                {t("walletTopup.paymentMethodLabel")}
              </Text>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingBottom: 8,
                }}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  {methods.map((method) => {
                    const isSelected = method._id === selectedId;
                    return (
                      <PressableScale
                        key={method._id}
                        onPress={() => setSelectedId(method._id)}
                        scaleTo={0.97}
                        style={{ width: "31%" }}
                      >
                        <GlowCard
                          radius={Radii.lg}
                          tone={isSelected ? palette.accent : palette.border}
                          intensity={isSelected ? "strong" : "soft"}
                          borderWidth={isSelected ? 1.5 : 1}
                          contentStyle={{
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                            paddingVertical: 2,
                            minHeight: 110,
                          }}
                        >
                          <Image
                            source={{ uri: resolveImageUrl(method.iconPath) }}
                            style={{ width: 52, height: 52 }}
                            contentFit="contain"
                          />
                          <Text
                            numberOfLines={2}
                            style={{
                              textAlign: "center",
                              fontSize: 12,
                              color: palette.text,
                              fontFamily: FontFamily.medium,
                              lineHeight: 16,
                            }}
                          >
                            {method.label}
                          </Text>
                        </GlowCard>
                      </PressableScale>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </>
        )}
      </View>

      {selectedMethod ? (
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopWidth: 1,
            borderTopColor: palette.border,
            backgroundColor: palette.background,
          }}
        >
          <NeonButton
            label={
              isSubmitting
                ? t("walletTopup.submitting")
                : t("walletTopup.continueButton")
            }
            size="lg"
            full
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleSubmit}
          />
        </View>
      ) : null}
    </View>
  );
};

export default WalletTopup;
