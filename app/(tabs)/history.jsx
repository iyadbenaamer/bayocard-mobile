import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import AutoHideTabBarFlatList from "../../components/AutoHideTabBarFlatList";
import NotificationsHeaderButton from "../../components/NotificationsHeaderButton";
import ScreenTitle from "../../components/Title";
import WalletHeaderButton from "../../components/WalletHeaderButton";
import Badge from "../../components/arcade/Badge";
import GlowCard from "../../components/arcade/GlowCard";
import IconBubble from "../../components/arcade/IconBubble";
import PressableScale from "../../components/arcade/Pressable";
import { FontFamily } from "../../constants/fonts";
import { Radii } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import { getPurchaseHistory } from "../../services/orderApi";
import getLocalizedText from "../../utils/localizedText";

const PAGE_SIZE = 15;
const SCREEN_PADDING = 24;

const HistoryItem = React.memo(({ order, palette }) => {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const formatAmount = (amount) => `${amount} ${t("history.currencySuffix")}`;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Intl.DateTimeFormat("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      numberingSystem: "latn",
    }).format(new Date(dateString));
  };

  const totalCards = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasDetails = order.items?.length > 0;

  return (
    <GlowCard
      radius={Radii.lg}
      intensity="soft"
      style={{ marginBottom: 12 }}
      contentStyle={{ padding: 0 }}
    >
      <PressableScale
        onPress={() => router.push(`/order/${order._id}`)}
        scaleTo={0.985}
        accessibilityRole="button"
        style={{
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <IconBubble size={42} variant="gradient">
          <Ionicons name="receipt" size={19} color="#FFFFFF" />
        </IconBubble>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              color: palette.text,
              fontFamily: FontFamily.bold,
            }}
          >
            {formatAmount(order.totalAmount)}
          </Text>
          <Text
            style={{
              marginTop: 3,
              fontSize: 11,
              color: palette.textFaint,
              fontFamily: FontFamily.regular,
            }}
          >
            {formatDate(order.createdAt)}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Badge
            label={t("history.cardsCount", { count: totalCards })}
            tone={palette.accent}
          />
          {hasDetails ? (
            <PressableScale
              onPress={() => setExpanded((prev) => !prev)}
              scaleTo={0.85}
              hitSlop={8}
              accessibilityRole="button"
              style={{
                width: 30,
                height: 30,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name={expanded ? "expand-less" : "expand-more"}
                size={26}
                color={palette.primary}
              />
            </PressableScale>
          ) : null}
        </View>
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
          {order.items.map((item, idx) => {
            const isLast = idx === order.items.length - 1;
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
                    {t("history.quantityLabel")} {item.quantity} ×{" "}
                    {formatAmount(item.price)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: palette.danger,
                    fontFamily: FontFamily.bold,
                  }}
                >
                  {formatAmount(item.price * item.quantity)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </GlowCard>
  );
});

export const History = () => {
  const { palette } = usePalette();
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const loadingMoreRef = useRef(false);

  const fetchOrders = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage("");
      setPage(1);
      setHasMore(true);
      try {
        const data = await getPurchaseHistory({ page: 1, limit: PAGE_SIZE });
        const list = data?.orders ?? [];
        const pagination = data?.pagination ?? {};
        setOrders(Array.isArray(list) ? list : []);
        setPage(1);
        setHasMore(Boolean(pagination.hasMore));
      } catch {
        setErrorMessage(t("history.fetchError"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadOrders = async () => {
        await fetchOrders(false);
      };

      if (isMounted) {
        loadOrders();
      }

      return () => {
        isMounted = false;
      };
    }, [fetchOrders]),
  );

  const handleRefresh = useCallback(async () => {
    await fetchOrders(true);
  }, [fetchOrders]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || isLoading || isLoadingMore)
      return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const data = await getPurchaseHistory({
        page: nextPage,
        limit: PAGE_SIZE,
      });
      const list = data?.orders ?? [];
      const pagination = data?.pagination ?? {};
      setOrders((prev) => [...prev, ...(Array.isArray(list) ? list : [])]);
      setPage(nextPage);
      setHasMore(Boolean(pagination.hasMore));
    } catch {
      setErrorMessage(t("history.fetchError"));
    } finally {
      setIsLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [page, hasMore, isLoading, isLoadingMore, t]);

  const handleEndReached = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    loadMore();
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  const renderItem = useCallback(
    ({ item }) => <HistoryItem order={item} palette={palette} />,
    [palette],
  );

  const keyExtractor = useCallback((order) => order._id, []);

  return (
    <AutoHideTabBarFlatList
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        paddingBottom: 24,
      }}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      data={orders}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View
          style={{
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <ScreenTitle>{t("history.title")}</ScreenTitle>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <NotificationsHeaderButton />
            <WalletHeaderButton />
          </View>
        </View>
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ paddingVertical: 16, alignItems: "center" }}>
            <ActivityIndicator color={palette.primary} size="small" />
          </View>
        ) : (
          <View style={{ height: 120 }} />
        )
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
                name={errorMessage ? "alert-circle" : "bag-handle-outline"}
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
              {errorMessage || t("history.emptyState")}
            </Text>
          </View>
        )
      }
    />
  );
};

export default History;
