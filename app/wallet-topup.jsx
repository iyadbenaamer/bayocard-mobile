import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
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
      const message =
        code === "WALLET_TOPUP_METHOD_UNAVAILABLE"
          ? t("walletTopup.errorMethodUnavailable")
          : code === "WALLET_TOPUP_AMOUNT_OUT_OF_RANGE"
            ? t("walletTopup.errorAmountOutOfRange")
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
      <KeyboardAwareScrollView
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      >
        <View className="px-6 pt-6">
          <ScreenTitle back>{t("walletTopup.title")}</ScreenTitle>

          {isLoadingMethods ? (
            <View className="mt-10 items-center">
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : methods.length === 0 ? (
            <Text
              className="mt-6 text-center"
              style={{ color: palette.textMuted, fontFamily: FontFamily.regular }}
            >
              {t("walletTopup.noMethodsAvailable")}
            </Text>
          ) : (
            <>
              {selectedMethod ? (
                <View className="mt-4">
                  {amountEnabled ? (
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
                      onChangeText={setAmount}
                      keyboardType="number-pad"
                      placeholder={t("walletTopup.amountPlaceholder")}
                    />
                  ) : (
                    <Text
                      className="mb-3 text-sm"
                      style={{
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

              <Text
                className="mt-2 mb-3"
                style={{
                  fontSize: 11,
                  color: palette.textMuted,
                  fontFamily: FontFamily.medium,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                {t("walletTopup.paymentMethodLabel")}
              </Text>
              <View style={{ gap: 10, marginBottom: 8 }}>
                {methods.map((method) => {
                  const isSelected = method._id === selectedId;
                  return (
                    <PressableScale
                      key={method._id}
                      onPress={() => setSelectedId(method._id)}
                      scaleTo={0.97}
                    >
                      <GlowCard
                        radius={Radii.lg}
                        tone={isSelected ? palette.accent : palette.border}
                        intensity={isSelected ? "strong" : "soft"}
                        borderWidth={isSelected ? 1.5 : 1}
                        contentStyle={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      >
                        <Image
                          source={{ uri: resolveImageUrl(method.iconPath) }}
                          style={{ width: 46, height: 46 }}
                          contentFit="contain"
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            flex: 1,
                            fontSize: 14,
                            color: palette.text,
                            fontFamily: FontFamily.medium,
                          }}
                        >
                          {method.label}
                        </Text>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: isSelected
                              ? palette.accent
                              : withAlpha(palette.borderStrong, isDark ? 0.9 : 1),
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isSelected ? (
                            <View
                              style={{
                                width: 11,
                                height: 11,
                                borderRadius: 6,
                                backgroundColor: palette.accent,
                              }}
                            />
                          ) : null}
                        </View>
                      </GlowCard>
                    </PressableScale>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
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
