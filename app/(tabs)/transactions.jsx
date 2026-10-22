import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import AutoHideTabBarFlatList from "../../components/AutoHideTabBarFlatList";
import ScreenTitle from "../../components/Title";
import Badge from "../../components/arcade/Badge";
import Chip from "../../components/arcade/Chip";
import GlowCard from "../../components/arcade/GlowCard";
import IconBubble from "../../components/arcade/IconBubble";
import PressableScale from "../../components/arcade/Pressable";
import SectionHeader from "../../components/arcade/SectionHeader";
import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import { verifyAccessToken } from "../../services/authApi";
import { getUserTransactions } from "../../services/transactionApi";
import { getUserById } from "../../services/userApi";
import { setUser } from "../../state/userSlice";

import formatDate from "../../utils/formatDate";
import getLocalizedText from "../../utils/localizedText";

const PAGE_SIZE = 15;
const SCREEN_PADDING = 24;

// Each transaction type gets its own glyph so the log can be skimmed by
// shape before the label is read.
const ICON_BY_TYPE = {
  deposit: "arrow-down",
  gateway_deposit: "card",
  purchase: "cart",
  refund: "return-down-back",
  exchange_sent: "arrow-up",
  exchange_received: "arrow-down",
};

const DetailRow = ({ label, value, palette }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderRadius: Radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 6,
      backgroundColor: palette.surfaceSunken,
    }}
  >
    <Text
      style={{
        fontSize: 12,
        color: palette.textMuted,
        fontFamily: FontFamily.medium,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: 13,
        color: palette.text,
        fontFamily: FontFamily.medium,
        flexShrink: 1,
        textAlign: "right",
      }}
    >
      {value}
    </Text>
  </View>
);

const TransactionItem = React.memo(
  ({ transaction, formatType, formatAmount, formatDisplayAmount, palette }) => {
    const { t, locale } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    const isPurchase = transaction.type === "purchase";
    const isExchange =
      transaction.type === "exchange_sent" ||
      transaction.type === "exchange_received";
    const hasDetails = isPurchase && transaction.orderId?.items?.length > 0;
    const isCredit =
      transaction.type === "deposit" ||
      transaction.type === "gateway_deposit" ||
      transaction.type === "refund" ||
      transaction.type === "exchange_received";
    const tone = isCredit ? palette.success : palette.danger;

    return (
      <GlowCard
        radius={Radii.lg}
        tone={tone}
        intensity="soft"
        style={{ marginBottom: 12 }}
        contentStyle={{ padding: 0 }}
      >
        <PressableScale
          onPress={() => hasDetails && setExpanded(!expanded)}
          disabled={!hasDetails}
          scaleTo={hasDetails ? 0.985 : 1}
          style={{ padding: 14 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <IconBubble size={40} tone={tone}>
              <Ionicons
                name={ICON_BY_TYPE[transaction.type] ?? "ellipse"}
                size={18}
                color={tone}
              />
            </IconBubble>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Badge label={formatType(transaction.type)} tone={tone} />
                {hasDetails ? (
                  <Text
                    style={{
                      fontSize: 11,
                      color: palette.accent,
                      fontFamily: FontFamily.medium,
                    }}
                  >
                    {expanded
                      ? t("transactions.hideDetails")
                      : t("transactions.showDetails")}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: palette.textFaint,
                  fontFamily: FontFamily.regular,
                }}
              >
                {formatDate(transaction.createdAt)}
              </Text>
            </View>

            <Text
              style={{
                color: tone,
                fontFamily: FontFamily.bold,
                fontSize: 17,
              }}
            >
              {formatDisplayAmount(transaction.amount, transaction.type)}
            </Text>
          </View>

          <DetailRow
            label={t("transactions.balanceBefore")}
            value={`${formatAmount(transaction.balanceBefore ?? 0)} ${t("transactions.currencySuffix")}`}
            palette={palette}
          />
          <DetailRow
            label={t("transactions.balanceAfter")}
            value={`${formatAmount(transaction.balanceAfter ?? 0)} ${t("transactions.currencySuffix")}`}
            palette={palette}
          />

          {isExchange && transaction.counterpartyName ? (
            <DetailRow
              label={
                transaction.type === "exchange_sent"
                  ? t("transactions.to")
                  : t("transactions.from")
              }
              value={`${transaction.counterpartyName} - ${transaction.counterpartyPhone}`}
              palette={palette}
            />
          ) : null}

          {transaction.type === "exchange_sent" &&
          typeof transaction.fee === "number" ? (
            <DetailRow
              label={t("transactions.fee")}
              value={
                transaction.fee > 0
                  ? `${formatAmount(transaction.fee)} ${t("transactions.currencySuffix")}`
                  : t("transactions.noFee")
              }
              palette={palette}
            />
          ) : null}
        </PressableScale>

        {expanded && hasDetails && (
          <View
            style={{
              paddingHorizontal: 14,
              paddingBottom: 14,
              paddingTop: 10,
              borderTopWidth: 1,
              borderColor: palette.border,
            }}
          >
            {transaction.orderId.items.map((item, idx) => {
              const isLast = idx === transaction.orderId.items.length - 1;
              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: isLast ? 0 : 12,
                    paddingBottom: isLast ? 0 : 12,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderColor: palette.border,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        marginBottom: 3,
                        color: palette.text,
                        fontFamily: FontFamily.bold,
                      }}
                    >
                      {item.tierId?.typeId?.name
                        ? `${getLocalizedText(item.tierId.typeId.name, locale)} - `
                        : ""}
                      {getLocalizedText(item.title, locale)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: palette.textMuted,
                        fontFamily: FontFamily.medium,
                      }}
                    >
                      {t("transactions.quantityLabel")} {item.quantity} ×{" "}
                      {formatAmount(item.price)}{" "}
                      {t("transactions.currencySuffix")}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: palette.danger,
                      fontFamily: FontFamily.bold,
                    }}
                  >
                    {formatAmount(item.price * item.quantity)}{" "}
                    {t("transactions.currencySuffix")}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </GlowCard>
    );
  },
);

export const Transactions = () => {
  const profile = useSelector((state) => state.user.profile);
  const dispatch = useDispatch();
  const router = useRouter();
  const { palette, gradients, isDark } = usePalette();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [errorMessage, setErrorMessage] = useState("");
  const loadingMoreRef = useRef(false);

  const formatAmount = useCallback((amount) => {
    const numeric = Number(amount) || 0;
    return new Intl.NumberFormat("ar", {
      numberingSystem: "latn",
      currency: "LYD",
      maximumFractionDigits: 2,
    }).format(numeric);
  }, []);

  const formatDisplayAmount = useCallback(
    (amount, type) => {
      const numeric = Number(amount) || 0;
      const isCredit =
        type === "deposit" ||
        type === "gateway_deposit" ||
        type === "refund" ||
        type === "exchange_received";
      const prefix = isCredit ? "+" : "-";
      const formatted = formatAmount(numeric);
      return `${prefix}${formatted} ${t("transactions.currencySuffix")}`;
    },
    [formatAmount, t],
  );

  const formatType = useCallback(
    (type) => {
      switch (type) {
        case "deposit":
          return t("transactions.types.deposit");
        case "gateway_deposit":
          return t("transactions.types.gatewayDeposit");
        case "purchase":
          return t("transactions.types.purchase");
        case "refund":
          return t("transactions.types.refund");
        case "exchange_sent":
          return t("transactions.types.exchangeSent");
        case "exchange_received":
          return t("transactions.types.exchangeReceived");
        default:
          return t("transactions.types.default");
      }
    },
    [t],
  );

  const loadTransactions = useCallback(
    async (reset = true, refresh = false) => {
      const loadPage = reset ? 1 : page + 1;
      if (reset) {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setErrorMessage("");
      } else {
        if (loadingMoreRef.current || !hasMore) return;
        loadingMoreRef.current = true;
        setIsLoadingMore(true);
      }

      try {
        const data = await getUserTransactions({
          sortBy,
          sortOrder,
          page: loadPage,
          limit: PAGE_SIZE,
        });

        const list = data?.transactions ?? [];
        const pagination = data?.pagination ?? {};
        const nextHasMore = Boolean(pagination.hasMore);

        if (reset) {
          setTransactions(Array.isArray(list) ? list : []);
          setPage(1);
        } else {
          setTransactions((prev) => [
            ...prev,
            ...(Array.isArray(list) ? list : []),
          ]);
          setPage((p) => p + 1);
        }
        setHasMore(nextHasMore);
      } catch {
        setErrorMessage(t("transactions.fetchError"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [sortBy, sortOrder, page, hasMore, t],
  );

  useFocusEffect(
    useCallback(() => {
      loadTransactions(true);
    }, [loadTransactions]),
  );

  const handleRefresh = useCallback(async () => {
    await loadTransactions(true, true);
  }, [loadTransactions]);

  const handleEndReached = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    loadTransactions(false);
  }, [hasMore, isLoading, isLoadingMore, loadTransactions]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshProfile = async () => {
        try {
          const session = await verifyAccessToken();
          if (!session?.id) {
            return;
          }
          const user = await getUserById(session.id);
          if (isActive && user) {
            dispatch(setUser(user));
          }
        } catch {
          // ignore refresh failures
        }
      };

      refreshProfile();

      return () => {
        isActive = false;
      };
    }, [dispatch]),
  );

  const sortOptions = [
    { key: "createdAt", label: t("transactions.sortDate") },
    { key: "amount", label: t("transactions.sortAmount") },
    { key: "type", label: t("transactions.sortType") },
  ];

  const renderItem = useCallback(
    ({ item }) => (
      <TransactionItem
        transaction={item}
        formatType={formatType}
        formatAmount={formatAmount}
        formatDisplayAmount={formatDisplayAmount}
        palette={palette}
      />
    ),
    [formatType, formatAmount, formatDisplayAmount, palette],
  );

  const keyExtractor = useCallback((transaction) => transaction._id, []);

  return (
    <AutoHideTabBarFlatList
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        paddingBottom: 132,
      }}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      data={transactions}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <ScreenTitle>{t("transactions.title")}</ScreenTitle>

          <View
            style={[
              { marginTop: 12, borderRadius: Radii.xl },
              glow(palette.primary, {
                opacity: 0.45,
                radius: 22,
                y: 10,
                elevation: 12,
                isDark,
              }),
            ]}
          >
            <LinearGradient
              colors={gradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: Radii.xl,
                padding: 18,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: withAlpha("#FFFFFF", isDark ? 0.12 : 0.24),
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: withAlpha("#FFFFFF", 0.72),
                  fontFamily: FontFamily.medium,
                  letterSpacing: 0.6,
                }}
              >
                {t("transactions.currentBalance")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 34,
                    color: "#FFFFFF",
                    fontFamily: FontFamily.bold,
                  }}
                >
                  {formatAmount(profile?.balance ?? 0)}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: withAlpha("#FFFFFF", 0.8),
                    fontFamily: FontFamily.medium,
                  }}
                >
                  {t("transactions.currencySuffix")}
                </Text>
              </View>

              <View style={{ marginTop: 18, flexDirection: "row", gap: 10 }}>
                {profile?.role === "individual" ? (
                  <PressableScale
                    onPress={() => router.push("/wallet-topup")}
                    scaleTo={0.94}
                    accessibilityRole="button"
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 11,
                      borderRadius: Radii.md,
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <Ionicons name="add" size={17} color={palette.brandDeep} />
                    <Text
                      style={{
                        fontSize: 13,
                        color: palette.brandDeep,
                        fontFamily: FontFamily.bold,
                      }}
                    >
                      {t("transactions.topUpBalance")}
                    </Text>
                  </PressableScale>
                ) : null}
                <PressableScale
                  onPress={() => router.push("/exchange")}
                  scaleTo={0.94}
                  accessibilityRole="button"
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 11,
                    borderRadius: Radii.md,
                    backgroundColor: withAlpha("#FFFFFF", 0.16),
                    borderWidth: 1,
                    borderColor: withAlpha("#FFFFFF", 0.28),
                  }}
                >
                  <Ionicons name="swap-horizontal" size={17} color="#FFFFFF" />
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#FFFFFF",
                      fontFamily: FontFamily.bold,
                    }}
                  >
                    {t("transactions.transferBalance")}
                  </Text>
                </PressableScale>
              </View>
            </LinearGradient>
          </View>

          <View style={{ marginTop: 22 }}>
            <Text
              style={{
                fontSize: 11,
                marginBottom: 8,
                color: palette.textMuted,
                fontFamily: FontFamily.medium,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {t("transactions.sortBy")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {sortOptions.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  active={option.key === sortBy}
                  onPress={() => setSortBy(option.key)}
                />
              ))}
            </View>
            <Text
              style={{
                fontSize: 11,
                marginBottom: 8,
                color: palette.textMuted,
                fontFamily: FontFamily.medium,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {t("transactions.order")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["asc", "desc"].map((order) => (
                <Chip
                  key={order}
                  label={
                    order === "asc"
                      ? t("transactions.ascending")
                      : t("transactions.descending")
                  }
                  active={order === sortOrder}
                  onPress={() => setSortOrder(order)}
                />
              ))}
            </View>
          </View>

          <SectionHeader
            title={t("transactions.transactionLog")}
            style={{ marginTop: 24, marginBottom: 14 }}
          />
        </View>
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ paddingVertical: 16, alignItems: "center" }}>
            <ActivityIndicator color={palette.primary} size="small" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 28, gap: 12 }}>
            <IconBubble
              size={56}
              tone={errorMessage ? palette.danger : palette.primary}
            >
              <Ionicons
                name={errorMessage ? "alert-circle" : "receipt-outline"}
                size={26}
                color={errorMessage ? palette.danger : palette.primary}
              />
            </IconBubble>
            <Text
              style={{
                textAlign: "center",
                color: errorMessage ? palette.danger : palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {errorMessage || t("transactions.emptyState")}
            </Text>
          </View>
        )
      }
    />
  );
};
export default Transactions;
