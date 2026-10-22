import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useRequireAuth } from "../components/RequireAuth";
import ScreenTitle from "../components/Title";
import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
import IconBubble from "../components/arcade/IconBubble";
import NeonButton from "../components/arcade/NeonButton";
import PressableScale from "../components/arcade/Pressable";
import PopupMessage from "../components/ui/PopupMessage";

import { FontFamily } from "../constants/fonts";
import { Radii, glow, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import {
  checkCartAvailability,
  checkoutCartLocally,
} from "../services/cartApi";
import generateUuid from "../utils/generateUuid";
import {
  applyAvailability,
  clearCart,
  removeItem,
  selectCartItems,
  selectCartWarnings,
  updateItemQuantity,
} from "../state/cartSlice";
import { selectUserProfile } from "../state/store";
import getLocalizedText from "../utils/localizedText";

// ─── Quantity Stepper ────────────────────────────────────────────────
const StepButton = ({ symbol, onPress, disabled, label }) => {
  const { palette, isDark } = usePalette();

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.86}
      accessibilityLabel={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: Radii.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: withAlpha(palette.primary, isDark ? 0.18 : 0.1),
        borderWidth: 1,
        borderColor: withAlpha(palette.primary, isDark ? 0.4 : 0.24),
      }}
    >
      <Text
        style={{
          fontSize: 18,
          lineHeight: 22,
          color: palette.primary,
          fontFamily: FontFamily.bold,
        }}
      >
        {symbol}
      </Text>
    </PressableScale>
  );
};

const QuantityStepper = ({ value, onDecrement, onIncrement, disabled }) => {
  const { palette } = usePalette();
  const { t } = useTranslation();

  return (
    <View style={styles.stepper}>
      <StepButton
        symbol="−"
        onPress={onDecrement}
        disabled={disabled}
        label={t("cart.decreaseQuantityLabel")}
      />
      <Text
        style={[
          styles.stepValue,
          { color: palette.text, fontFamily: FontFamily.bold },
        ]}
      >
        {value}
      </Text>
      <StepButton
        symbol="+"
        onPress={onIncrement}
        disabled={disabled}
        label={t("cart.increaseQuantityLabel")}
      />
    </View>
  );
};

// ─── Cart Item Card ─────────────────────────────────────────────────
const CartItemCard = ({
  item,
  warning,
  onDecrement,
  onIncrement,
  onRemove,
  disabled,
}) => {
  const { palette } = usePalette();
  const { t, locale } = useTranslation();

  return (
    <GlowCard
      radius={Radii.lg}
      tone={warning ? palette.warning : palette.primary}
      intensity="soft"
      contentStyle={{ padding: 14, gap: 12 }}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          {item.typeName ? (
            <Text
              style={[
                styles.typeLabel,
                { color: palette.textFaint, fontFamily: FontFamily.regular },
              ]}
            >
              {getLocalizedText(item.typeName, locale)}
            </Text>
          ) : null}
          <Text
            style={[
              styles.tierTitle,
              { color: palette.text, fontFamily: FontFamily.bold },
            ]}
          >
            {getLocalizedText(item.title, locale) || "—"}
          </Text>
        </View>
        <PressableScale
          onPress={() => onRemove(item.id)}
          scaleTo={0.85}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("cart.removeLabel")}
          style={{
            width: 30,
            height: 30,
            borderRadius: Radii.sm,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(palette.danger, 0.12),
          }}
        >
          <Ionicons name="close" size={16} color={palette.danger} />
        </PressableScale>
      </View>

      <View style={styles.cardFooter}>
        <Text
          style={[
            styles.price,
            { color: palette.accent, fontFamily: FontFamily.bold },
          ]}
        >
          {t("cart.priceLine", {
            price: item.buyPrice,
            quantity: item.quantity,
            total: (item.buyPrice * item.quantity).toFixed(2),
          })}
        </Text>
        <QuantityStepper
          value={item.quantity}
          onDecrement={() => onDecrement(item)}
          onIncrement={() => onIncrement(item)}
          disabled={disabled}
        />
      </View>

      {warning && (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: withAlpha(palette.warning, 0.12),
              borderColor: withAlpha(palette.warning, 0.5),
            },
          ]}
        >
          <Ionicons name="warning" size={14} color={palette.warning} />
          <Text
            style={[
              styles.warningText,
              { color: palette.warning, fontFamily: FontFamily.regular },
            ]}
          >
            {warning}
          </Text>
        </View>
      )}
    </GlowCard>
  );
};

// ─── Cart Screen ─────────────────────────────────────────────────────────────
const CartScreen = () => {
  const authStatus = useRequireAuth();
  const { palette, isDark } = usePalette();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const warnings = useSelector(selectCartWarnings);
  const profile = useSelector(selectUserProfile);
  const isBusiness = profile?.role === "business";
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Persists across retries of the same checkout attempt so the server can
  // recognize (and safely dedupe) a duplicated/raced request; cleared once
  // the attempt succeeds so a later, distinct checkout gets a fresh key.
  const checkoutKeyRef = useRef(null);
  // Mirrors isCheckingOut but updates synchronously (state updates don't,
  // and disabling the button also needs a re-render + native bridge
  // round-trip) - without this, two taps landing before that round-trip
  // completes both read isCheckingOut as false and both start a checkout.
  const isCheckingOutRef = useRef(false);

  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
    duration: 3000,
  });

  const showPopup = (message, type = "info", duration = 3000) => {
    setPopup({ visible: true, message, type, duration });
  };

  const warningMap = Object.fromEntries(
    warnings.map((w) => [w.tierId, w.message]),
  );

  const subtotal = items.reduce(
    (sum, item) => sum + item.buyPrice * item.quantity,
    0,
  );

  const runAvailabilityCheck = useCallback(
    async (updatedItems) => {
      if (!updatedItems.length) return;
      setIsChecking(true);
      try {
        const payload = updatedItems.map((item) => ({
          tierId: item.id,
          quantity: item.quantity,
        }));
        const result = await checkCartAvailability(payload);
        dispatch(applyAvailability(result));
      } catch {
        // Silently ignore network errors during check
      } finally {
        setIsChecking(false);
      }
    },
    [dispatch],
  );

  const handleDecrement = useCallback(
    (item) => {
      const newQty = item.quantity - 1;
      if (newQty <= 0) {
        dispatch(removeItem(item.id));
      } else {
        dispatch(updateItemQuantity({ id: item.id, quantity: newQty }));
        const updated = items
          .map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
          .filter((i) => i.quantity > 0);
        runAvailabilityCheck(updated);
      }
    },
    [dispatch, items, runAvailabilityCheck],
  );

  const handleIncrement = useCallback(
    (item) => {
      const newQty = item.quantity + 1;
      dispatch(updateItemQuantity({ id: item.id, quantity: newQty }));
      const updated = items.map((i) =>
        i.id === item.id ? { ...i, quantity: newQty } : i,
      );
      runAvailabilityCheck(updated);
    },
    [dispatch, items, runAvailabilityCheck],
  );

  const handleRemove = useCallback(
    (id) => {
      dispatch(removeItem(id));
    },
    [dispatch],
  );

  const handleClearCart = () => {
    // simply clear and inform via popup
    dispatch(clearCart());
    showPopup(t("cart.cartCleared"), "success");
  };

  const handleCheckout = async () => {
    if (items.length === 0 || isCheckingOutRef.current) return;
    isCheckingOutRef.current = true;
    setIsCheckingOut(true);
    try {
      // Reuse the same key across retries of this attempt (e.g. a lost
      // response) so the server can safely dedupe a raced/duplicated
      // request instead of double-charging the user.
      if (!checkoutKeyRef.current) {
        checkoutKeyRef.current = generateUuid();
      }
      const payload = items.map((item) => ({
        tierId: item.id,
        quantity: item.quantity,
      }));
      const response = await checkoutCartLocally(
        payload,
        checkoutKeyRef.current,
      );
      checkoutKeyRef.current = null;

      const purchasedCount = response.cards?.length || 0;
      let msg = t("cart.purchaseSuccessMessage", { count: purchasedCount });
      if (response.partialFailure) {
        msg += t("cart.partialFailureNote");
      }

      // inform user of successful purchase before redirecting
      showPopup(msg, "success", 4000);
      // Stay locked (isCheckingOut/isCheckingOutRef both still true) through
      // this delay and into the navigation itself - only unlocked on error
      // below - so a second tap in this window can't fire a second, fully
      // distinct checkout (checkoutKeyRef was just cleared above, so it
      // wouldn't even be caught by the server's idempotency check).
      setTimeout(() => {
        dispatch(clearCart());
        // Printing is a business-only feature - individual accounts land on
        // the order screen without triggering the auto-print flow.
        const suffix = isBusiness ? "?autoPrint=true" : "";
        router.replace(`/order/${response.order._id}${suffix}`);
      }, 1000);
    } catch (err) {
      isCheckingOutRef.current = false;
      setIsCheckingOut(false);
      if (
        err.response?.status === 409 &&
        err.response?.data?.code === "CART_AVAILABILITY_CHANGED"
      ) {
        showPopup(t("cart.availabilityChangedMessage"), "warning");
        if (err.response.data.details) {
          dispatch(applyAvailability(err.response.data.details));
        }
      } else if (
        err.response?.status === 400 &&
        err.response?.data?.code === "USER_BALANCE_INSUFFICIENT"
      ) {
        showPopup(t("cart.insufficientBalanceMessage"), "error");
      } else if (
        err.response?.status === 403 &&
        err.response?.data?.code === "USER_CANNOT_BUY"
      ) {
        showPopup(t("cart.purchaseDisabledMessage"), "warning");
      } else {
        const message =
          err.response?.data?.code || t("cart.genericCheckoutError");
        showPopup(message, "error");
      }
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!items.length || isCheckingOut) {
      return;
    }
    setIsRefreshing(true);
    await runAvailabilityCheck(items);
    setIsRefreshing(false);
  }, [items, isCheckingOut, runAvailabilityCheck]);

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

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PopupMessage
          visible={popup.visible}
          message={popup.message}
          type={popup.type}
          duration={popup.duration}
          onClose={() => setPopup((p) => ({ ...p, visible: false }))}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ScreenTitle back>{t("cart.title")}</ScreenTitle>
          </View>
          {items.length > 0 && (
            <PressableScale
              onPress={handleClearCart}
              scaleTo={0.92}
              hitSlop={8}
              accessibilityRole="button"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: Radii.pill,
                backgroundColor: withAlpha(palette.danger, 0.12),
                borderWidth: 1,
                borderColor: withAlpha(palette.danger, 0.3),
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: palette.danger,
                  fontFamily: FontFamily.medium,
                }}
              >
                {t("cart.clearButton")}
              </Text>
            </PressableScale>
          )}
        </View>

        {isChecking && (
          <View
            style={[
              styles.checkingBanner,
              { backgroundColor: withAlpha(palette.primary, 0.12) },
            ]}
          >
            <ActivityIndicator size="small" color={palette.primary} />
            <Text
              style={[
                styles.checkingText,
                { color: palette.primary, fontFamily: FontFamily.medium },
              ]}
            >
              {t("cart.checkingAvailability")}
            </Text>
          </View>
        )}

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <IconBubble size={88} radius={Radii.xxl} variant="gradient">
              <Ionicons name="cart-outline" size={38} color="#FFFFFF" />
            </IconBubble>
            <Text
              style={[
                styles.emptyTitle,
                { color: palette.text, fontFamily: FontFamily.bold },
              ]}
            >
              {t("cart.emptyCartTitle")}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: palette.textMuted, fontFamily: FontFamily.regular },
              ]}
            >
              {t("cart.emptyCartSubtitle")}
            </Text>
            <NeonButton
              label={t("home.browseCards")}
              onPress={() => router.replace("/cards")}
              style={{ marginTop: 6 }}
            />
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
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
              {items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  warning={warningMap[item.id]}
                  onDecrement={handleDecrement}
                  onIncrement={handleIncrement}
                  onRemove={handleRemove}
                  disabled={isChecking}
                />
              ))}
            </ScrollView>

            {/* Checkout bar - lifted off the list with its own glow so the
                total and the commit button stay readable while scrolling. */}
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: palette.surfaceElevated,
                  borderTopColor: palette.border,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
                glow(isDark ? "#000" : palette.primary, {
                  opacity: 0.6,
                  radius: 20,
                  y: -6,
                  elevation: 20,
                  isDark,
                }),
              ]}
            >
              <View style={styles.subtotalRow}>
                <Text
                  style={[
                    styles.subtotalLabel,
                    { color: palette.textMuted, fontFamily: FontFamily.medium },
                  ]}
                >
                  {t("cart.subtotalLabel")}
                </Text>
                <Text
                  style={[
                    styles.subtotalValue,
                    { color: palette.text, fontFamily: FontFamily.bold },
                  ]}
                >
                  {t("cart.subtotalValue", { amount: subtotal.toFixed(2) })}
                </Text>
              </View>
              <NeonButton
                label={t("cart.checkoutButton")}
                size="lg"
                full
                loading={isCheckingOut}
                disabled={isCheckingOut || isChecking || items.length === 0}
                onPress={handleCheckout}
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  checkingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
  },
  checkingText: { fontSize: 12 },
  list: { padding: 20, gap: 12, paddingBottom: 28 },
  // Cart Item
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  typeLabel: { fontSize: 11, marginBottom: 3 },
  tierTitle: { fontSize: 15 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  price: { fontSize: 13, flexShrink: 1 },
  // Stepper
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepValue: { fontSize: 15, minWidth: 24, textAlign: "center" },
  // Warning
  warningBox: {
    borderRadius: Radii.sm,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningText: { fontSize: 12, flex: 1 },
  // Empty
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, textAlign: "center", marginTop: 4 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 14,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtotalLabel: { fontSize: 13 },
  subtotalValue: { fontSize: 22 },
});

export default CartScreen;
