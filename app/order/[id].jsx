import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import ArrowLeftIcon from "../../assets/icons/arrow-left.svg";
import ArrowRightIcon from "../../assets/icons/arrow-right.svg";
import { useRequireAuth } from "../../components/RequireAuth";
import AmbientBackdrop from "../../components/arcade/AmbientBackdrop";
import GlowCard from "../../components/arcade/GlowCard";
import PressableScale from "../../components/arcade/Pressable";
import SectionHeader from "../../components/arcade/SectionHeader";
import PopupMessage from "../../components/ui/PopupMessage";
import { FontFamily } from "../../constants/fonts";
import { Radii, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import RedeemedCardTile from "../../components/RedeemedCardTile";
import { getOrderById } from "../../services/orderApi";
import { printReceipt } from "../../services/printerManager.js";
import formatDate from "../../utils/formatDate.js";
import getLocalizedText from "../../utils/localizedText.js";

const OrderDetails = () => {
  const authStatus = useRequireAuth();
  const { id, autoPrint } = useLocalSearchParams();
  const router = useRouter();
  const { palette, isDark } = usePalette();
  const { t, isRTL, locale } = useTranslation();
  const BackIcon = isRTL ? ArrowRightIcon : ArrowLeftIcon;
  const user = useSelector((state) => state.user);
  // Printing receipts is a business-only feature - individual accounts
  // never see the print controls or trigger the post-checkout auto-print.
  const isBusiness = user?.profile?.role === "business";
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const formatAmount = (amount) => {
    return t("orderDetail.amountWithCurrency", { amount });
  };

  const showPopup = (message, type = "info") =>
    setPopup({ visible: true, message, type });
  const closePopup = () => setPopup((prev) => ({ ...prev, visible: false }));

  // Always prints via the printer selected in Printer Settings only -
  // never probes a device's built-in printer.
  const handlePrint = async (cardData) => {
    try {
      await printReceipt(cardData, {
        name: user?.profile?.name || t("orderDetail.defaultUserName"),
        support: user?.support || "",
      });
    } catch (err) {
      console.error("Print error:", err);
      if (err?.message === "NO_PRINTER_CONFIGURED") {
        showPopup(t("orderDetail.noPrinterConfigured"), "warning");
      } else {
        showPopup(t("orderDetail.printFailed"), "error");
      }
    }
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Printing several cards back-to-back sends each one right after the
  // previous job's print+cut cycle - the printer is sometimes still busy
  // for a moment, which fails that one card without affecting the others.
  // NO_PRINTER_CONFIGURED is a permanent config error rather than a
  // transient one, so it's never retried.
  const PRINT_RETRY_ATTEMPTS = 3;
  const PRINT_RETRY_DELAY_MS = 800;
  const printCardWithRetry = async (cardData, printerInfo) => {
    let lastError;
    for (let attempt = 1; attempt <= PRINT_RETRY_ATTEMPTS; attempt++) {
      try {
        await printReceipt(cardData, printerInfo);
        return;
      } catch (err) {
        lastError = err;
        if (err?.message === "NO_PRINTER_CONFIGURED") {
          throw err;
        }
        if (attempt < PRINT_RETRY_ATTEMPTS) {
          await wait(PRINT_RETRY_DELAY_MS);
        }
      }
    }
    throw lastError;
  };

  const handleCopy = async (value) => {
    if (!value) {
      return;
    }
    try {
      await Clipboard.setStringAsync(String(value));
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  const handlePrintAll = async () => {
    const allCards = [];
    order.items.forEach((item) => {
      const tierName = getLocalizedText(item.tierId?.typeId?.name, locale);
      const redeemFormat = item.tierId?.typeId?.redeemFormat;
      const printImage = item.tierId?.typeId?.printImage;
      const notes = item.tierId?.typeId?.notes;
      const showExpiryDateDay = item.tierId?.typeId?.showExpiryDateDay;
      item.cards.forEach((card) => {
        allCards.push({
          card,
          title: getLocalizedText(item.title, locale),
          tierName,
          redeemFormat,
          printImage,
          notes,
          showExpiryDateDay,
        });
      });
    });

    const printerInfo = {
      name: user?.profile?.name || t("orderDetail.defaultUserName"),
      support: user?.support || "",
    };

    // Cards share a single printer connection, so they must print one at a
    // time rather than concurrently (Bluetooth can't handle overlapping
    // transfers, and a raw TCP socket would otherwise interleave output).
    // A short pause between cards also gives the printer a moment to finish
    // its physical print+cut cycle before the next connection attempt.
    let failures = 0;
    for (const cardData of allCards) {
      try {
        await printCardWithRetry(cardData, printerInfo);
      } catch (err) {
        console.error("Print all error:", err);
        if (err?.message === "NO_PRINTER_CONFIGURED") {
          showPopup(t("orderDetail.noPrinterConfigured"), "warning");
          return;
        }
        failures += 1;
      }
      await wait(PRINT_RETRY_DELAY_MS);
    }

    if (failures > 0) {
      showPopup(
        t("orderDetail.printFailuresMessage", {
          failed: failures,
          total: allCards.length,
        }),
        "error",
      );
    }
  };

  const fetchOrder = useCallback(
    async (refresh = false) => {
      if (!id) {
        return;
      }
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        setError(null);
        const data = await getOrderById(id);
        setOrder(data);
      } catch (err) {
        setError(err.response?.data?.code || t("orderDetail.fetchError"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchOrder(false);
  }, [fetchOrder]);

  const handleRefresh = useCallback(async () => {
    await fetchOrder(true);
  }, [fetchOrder]);

  // trigger auto-print once order is loaded and parameter is set
  useEffect(() => {
    if (
      order &&
      isBusiness &&
      autoPrint === "true" &&
      !hasAutoPrinted &&
      order.items &&
      order.items.length > 0
    ) {
      handlePrintAll();
      setHasAutoPrinted(true);
    }
  }, [order, isBusiness, autoPrint, hasAutoPrinted]);

  if (authStatus === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (authStatus === "unauth" || authStatus === "inactive") {
    return null;
  }

  if (isLoading) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: palette.background }}
      >
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: palette.background }}
      >
        <View
          className="p-4 flex-row items-center border-b"
          style={{ borderBottomColor: palette.border }}
        >
          <PressableScale onPress={() => router.back()} scaleTo={0.88}>
            <BackIcon width={28} height={28} color={palette.primary} />
          </PressableScale>
          <Text
            className="text-xl ml-4"
            style={{ color: palette.text, fontFamily: FontFamily.bold }}
          >
            {t("orderDetail.title")}
          </Text>
        </View>
        <View className="flex-1 justify-center items-center p-6">
          <Text
            className="text-center mb-4"
            style={{ color: palette.danger, fontFamily: FontFamily.regular }}
          >
            {error || t("orderDetail.orderNotFound")}
          </Text>
          <PressableScale
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: Radii.md,
              backgroundColor: palette.primary,
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "white", fontFamily: FontFamily.bold }}>
              {t("orderDetail.back")}
            </Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: palette.background }}
    >
      <AmbientBackdrop />
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      {/* Header */}
      <View
        className="px-6 py-4 flex-row items-center"
        style={{
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        }}
      >
        <PressableScale
          onPress={() => router.back()}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={{
            width: 40,
            height: 40,
            borderRadius: Radii.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(palette.primary, isDark ? 0.16 : 0.09),
            borderWidth: 1,
            borderColor: withAlpha(palette.primary, isDark ? 0.34 : 0.2),
          }}
        >
          <BackIcon width={22} height={22} color={palette.primary} />
        </PressableScale>
        <Text
          className="flex-1 text-xl"
          style={{ color: palette.text, fontFamily: FontFamily.bold }}
        >
          {t("orderDetail.title")}
        </Text>
        {isBusiness ? (
          <PressableScale
            onPress={handlePrintAll}
            scaleTo={0.93}
            accessibilityRole="button"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: Radii.pill,
              backgroundColor: withAlpha(palette.primary, isDark ? 0.16 : 0.09),
              borderWidth: 1,
              borderColor: withAlpha(palette.primary, isDark ? 0.34 : 0.2),
            }}
          >
            <MaterialCommunityIcons
              name="printer"
              size={18}
              color={palette.primary}
            />
            <Text
              style={{
                fontSize: 13,
                color: palette.primary,
                fontFamily: FontFamily.bold,
              }}
            >
              {t("orderDetail.printAll")}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={palette.surface}
          />
        }
      >
        {/* Order Info Card */}
        <GlowCard
          radius={Radii.xl}
          intensity="strong"
          style={{ marginBottom: 24 }}
          contentStyle={{ padding: 20 }}
        >
          <Text
            className="text-xs mb-1"
            style={{ color: palette.textFaint, fontFamily: FontFamily.regular }}
          >
            {t("orderDetail.orderNumberLabel")}
          </Text>
          <Text
            className="text-base mb-4"
            style={{ color: palette.text, fontFamily: FontFamily.bold }}
          >
            {order._id}
          </Text>

          <View className="flex-row justify-between mb-4">
            <View>
              <Text
                className="text-xs mb-1"
                style={{
                  color: palette.textFaint,
                  fontFamily: FontFamily.regular,
                }}
              >
                {t("orderDetail.dateLabel")}
              </Text>
              <Text
                style={{ color: palette.text, fontFamily: FontFamily.medium }}
              >
                {formatDate(order.createdAt)}
              </Text>
            </View>
            <View className="items-end">
              <Text
                className="text-xs mb-1"
                style={{
                  color: palette.textFaint,
                  fontFamily: FontFamily.regular,
                }}
              >
                {t("orderDetail.totalLabel")}
              </Text>
              <Text
                className="text-2xl"
                style={{ color: palette.accent, fontFamily: FontFamily.bold }}
              >
                {formatAmount(order.totalAmount)}
              </Text>
            </View>
          </View>
        </GlowCard>

        <SectionHeader
          title={t("orderDetail.purchasedCardsTitle")}
          style={{ marginBottom: 16 }}
        />

        {order.items.map((item, idx) => (
          <View key={idx} className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text
                className="text-base flex-1"
                style={{ color: palette.text, fontFamily: FontFamily.bold }}
              >
                {item.tierId?.typeId?.name
                  ? `${getLocalizedText(item.tierId.typeId.name, locale)} - `
                  : ""}
                {getLocalizedText(item.title, locale)}
              </Text>
              <Text
                style={{ color: palette.icon, fontFamily: FontFamily.medium }}
              >
                {item.quantity} × {formatAmount(item.price)}
              </Text>
            </View>
            {item.cards.map((card, cIdx) => (
              <RedeemedCardTile
                key={cIdx}
                card={card}
                title={getLocalizedText(item.title, locale)}
                tierName={getLocalizedText(item.tierId?.typeId?.name, locale)}
                image={item.tierId?.typeId?.image}
                showExpiryDateDay={item.tierId?.typeId?.showExpiryDateDay}
                isBusiness={isBusiness}
                palette={palette}
                onCopy={handleCopy}
                onPrint={() =>
                  handlePrint({
                    card,
                    title: getLocalizedText(item.title, locale),
                    tierName: getLocalizedText(
                      item.tierId?.typeId?.name,
                      locale,
                    ),
                    redeemFormat: item.tierId?.typeId?.redeemFormat,
                    printImage: item.tierId?.typeId?.printImage,
                    notes: item.tierId?.typeId?.notes,
                    showExpiryDateDay: item.tierId?.typeId?.showExpiryDateDay,
                  })
                }
              />
            ))}

            {item.tierId?.typeId?.notes ? (
              <View
                className="mb-3 p-3 rounded-lg"
                style={{
                  backgroundColor: palette.background,
                  borderLeftColor: palette.primary,
                  borderLeftWidth: 3,
                }}
              >
                <Text
                  className="text-xs"
                  style={{
                    color: palette.icon,
                    fontFamily: FontFamily.regular,
                    marginBottom: 4,
                  }}
                >
                  {t("orderDetail.notesLabel")}
                </Text>
                <Text
                  className="text-sm"
                  style={{
                    color: palette.text,
                    fontFamily: FontFamily.regular,
                  }}
                >
                  {item.tierId.typeId.notes}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetails;
