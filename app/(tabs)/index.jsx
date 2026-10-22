import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import browseCardsImage from "../../assets/images/browse-cards.png";
import NotificationsHeaderButton from "../../components/NotificationsHeaderButton";
import WalletHeaderButton from "../../components/WalletHeaderButton";
import AmbientBackdrop from "../../components/arcade/AmbientBackdrop";
import Badge from "../../components/arcade/Badge";
import GlowCard from "../../components/arcade/GlowCard";
import PressableScale from "../../components/arcade/Pressable";
import SectionHeader from "../../components/arcade/SectionHeader";
import Shimmer from "../../components/arcade/Shimmer";
import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import { getTopDiscountedCardTiers } from "../../services/cardTierApi";
import { getTopSoldCardTypes } from "../../services/cardTypeApi";
import { getDeals } from "../../services/dealApi";
import { selectUserProfile } from "../../state/store";
import getLocalizedText from "../../utils/localizedText";

const SCREEN_PADDING = 24;
const TOP_SOLD_CARD_SIZE = 104;
const TOP_SOLD_PLACEHOLDER_IMAGE =
  "https://via.placeholder.com/200x140?text=Card";

const DISCOUNT_CARD_WIDTH = 172;

// ─── Greeting ────────────────────────────────────────────────────────────────

/**
 * A slim welcome bar rather than a balance panel: the wallet button already
 * carries the live balance, and the transactions tab owns topping up and
 * transferring, so repeating them here just duplicated two screens on the
 * one people open most.
 */
const GreetingBar = ({ profile }) => {
  const { palette, gradients } = usePalette();
  const { t } = useTranslation();
  const initial = (profile?.name ?? "").trim().charAt(0).toUpperCase();

  return (
    <GlowCard
      radius={Radii.xl}
      intensity="soft"
      style={{ marginHorizontal: SCREEN_PADDING }}
      contentStyle={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      {/* Gradient ring around the avatar, so the identity reads as "yours"
          without needing an uploaded photo. */}
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 46,
          height: 46,
          borderRadius: Radii.md,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {initial ? (
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: FontFamily.bold,
              fontSize: 19,
            }}
          >
            {initial}
          </Text>
        ) : (
          <Ionicons name="game-controller" size={21} color="#FFFFFF" />
        )}
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            color: palette.textMuted,
            fontFamily: FontFamily.medium,
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          {t("home.welcomeBack")}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: palette.text,
            fontFamily: FontFamily.bold,
            fontSize: 17,
            marginTop: 2,
          }}
        >
          {profile?.name || t("home.player")}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <NotificationsHeaderButton />
        <WalletHeaderButton />
      </View>
    </GlowCard>
  );
};

// ─── Discounts ───────────────────────────────────────────────────────────────

/**
 * Deliberately static. This badge used to breathe on an infinite spring, but
 * there is one per card in a horizontally scrolling rail, so a rail of six
 * discounts meant six perpetual animations competing with the scroll itself
 * on the low-spec POS hardware this app targets. The badge already draws the
 * eye through colour and the strike-through price beneath it.
 */
const DiscountBadge = React.memo(({ percentage }) => (
  <View style={{ alignSelf: "flex-end" }}>
    <Badge
      label={`-${percentage}%`}
      icon={<Ionicons name="flash" size={11} color="#fff" />}
      gradient={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.12)"]}
      tone="#FFFFFF"
    />
  </View>
));

DiscountBadge.displayName = "DiscountBadge";

const DiscountCardItem = React.memo(({ item, onPress, gradients, isDark }) => {
  const { t, locale } = useTranslation();
  const imageUri = item.image
    ? `${process.env.EXPO_PUBLIC_API_URL}${item.image}`
    : TOP_SOLD_PLACEHOLDER_IMAGE;

  return (
    <PressableScale
      onPress={() => onPress(item.typeId)}
      scaleTo={0.95}
      style={[
        { width: DISCOUNT_CARD_WIDTH, borderRadius: Radii.xl },
        glow("#FF3D9A", {
          opacity: 0.4,
          radius: 16,
          y: 8,
          elevation: 10,
          isDark,
        }),
      ]}
    >
      <LinearGradient
        colors={gradients.heat}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: DISCOUNT_CARD_WIDTH,
          borderRadius: Radii.xl,
          padding: 10,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: withAlpha("#FFFFFF", 0.28),
        }}
      >
        {/* Diagonal sheen: sells the glossy-collectible look that a flat
            gradient alone never gets to. */}
        <LinearGradient
          colors={[withAlpha("#FFFFFF", 0.28), "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 0.7 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "65%",
          }}
        />

        <DiscountBadge percentage={item.percentage} />

        <View style={{ alignItems: "center", marginTop: 6 }}>
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: Radii.lg,
              overflow: "hidden",
              backgroundColor: withAlpha("#FFFFFF", 0.2),
              borderWidth: 2,
              borderColor: withAlpha("#FFFFFF", 0.85),
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={item.tierId}
            />
          </View>
        </View>

        <Text
          numberOfLines={1}
          style={{
            marginTop: 10,
            fontSize: 14,
            fontFamily: FontFamily.bold,
            color: "#fff",
            textAlign: "center",
          }}
        >
          {getLocalizedText(item.typeName, locale)}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 11,
            fontFamily: FontFamily.regular,
            color: withAlpha("#FFFFFF", 0.85),
            textAlign: "center",
          }}
        >
          {getLocalizedText(item.tierTitle, locale)}
        </Text>

        <View style={{ marginTop: 10, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 12,
              fontFamily: FontFamily.regular,
              color: withAlpha("#FFFFFF", 0.7),
              textDecorationLine: "line-through",
            }}
          >
            {item.sellPrice} {t("home.currency")}
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontFamily: FontFamily.bold,
              color: "#fff",
            }}
          >
            {item.discountedPrice} {t("home.currency")}
          </Text>
        </View>
      </LinearGradient>
    </PressableScale>
  );
});

// ─── Best sellers ────────────────────────────────────────────────────────────

const TopSoldCardItem = React.memo(
  ({ item, palette, onPress, locale, rank }) => {
    const imageUri = item.image
      ? `${process.env.EXPO_PUBLIC_API_URL}${item.image}`
      : TOP_SOLD_PLACEHOLDER_IMAGE;

    return (
      <PressableScale
        onPress={() => onPress(item._id)}
        scaleTo={0.94}
        style={{ width: TOP_SOLD_CARD_SIZE }}
      >
        <GlowCard
          radius={Radii.lg}
          intensity="soft"
          contentStyle={{ padding: 0 }}
        >
          <View style={{ width: "100%", height: TOP_SOLD_CARD_SIZE - 2 }}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={item._id}
            />
            {rank != null && rank < 3 ? (
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  width: 22,
                  height: 22,
                  borderRadius: Radii.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: withAlpha("#000000", 0.55),
                  borderWidth: 1,
                  borderColor: withAlpha(palette.accent, 0.7),
                }}
              >
                <Text
                  style={{
                    color: palette.accent,
                    fontFamily: FontFamily.bold,
                    fontSize: 11,
                  }}
                >
                  {rank + 1}
                </Text>
              </View>
            ) : null}
          </View>
        </GlowCard>
        <Text
          numberOfLines={2}
          style={{
            marginTop: 8,
            fontSize: 12,
            fontFamily: FontFamily.bold,
            color: palette.text,
            textAlign: "center",
          }}
        >
          {getLocalizedText(item.name, locale)}
        </Text>
      </PressableScale>
    );
  },
);

// ─── Promos ──────────────────────────────────────────────────────────────────

const PromoCarouselCard = React.memo(({ item, onPress, width }) => (
  <PressableScale
    onPress={() => onPress(item)}
    scaleTo={0.97}
    style={{
      width,
      height: 184,
      borderRadius: Radii.xl,
      overflow: "hidden",
      backgroundColor: "#0F1730",
    }}
  >
    <Image
      source={{ uri: item.imageUri }}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={item._id}
    />
    {/* Keeps the badge readable no matter how bright the uploaded banner is. */}
    <LinearGradient
      colors={["rgba(4,7,16,0.55)", "transparent", "rgba(4,7,16,0.4)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    />
    {item.badge ? (
      <View style={{ position: "absolute", top: 14, right: 14 }}>
        <Badge
          label={item.badge}
          gradient={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.12)"]}
          tone="#FFFFFF"
        />
      </View>
    ) : null}
  </PressableScale>
));

// ─── Screen ──────────────────────────────────────────────────────────────────

export const Home = () => {
  const router = useRouter();
  const { palette, gradients, isDark } = usePalette();
  const { t, locale, isRTL } = useTranslation();
  const profile = useSelector(selectUserProfile);
  const promoListRef = useRef(null);
  const { width: windowWidth } = useWindowDimensions();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [deals, setDeals] = useState([]);
  const [topSoldCardTypes, setTopSoldCardTypes] = useState([]);
  const [topDiscountedTiers, setTopDiscountedTiers] = useState([]);
  const [isLoadingRails, setIsLoadingRails] = useState(true);

  const promoCardWidth = windowWidth - SCREEN_PADDING * 2;

  // Deals are a retail/individual-facing promotional feature - business
  // accounts never see the promo carousel at all.
  const loadDeals = useCallback(async () => {
    if (profile?.role === "business") {
      setDeals([]);
      return;
    }
    try {
      const data = await getDeals();
      const list = Array.isArray(data) ? data : [];
      setDeals(
        list.map((deal) => ({
          ...deal,
          imageUri: deal.background
            ? `${process.env.EXPO_PUBLIC_API_URL}${deal.background}`
            : null,
        })),
      );
    } catch {
      setDeals([]);
    }
  }, [profile?.role]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const loadTopSoldCardTypes = useCallback(async () => {
    try {
      const data = await getTopSoldCardTypes();
      setTopSoldCardTypes(Array.isArray(data) ? data : []);
    } catch {
      setTopSoldCardTypes([]);
    }
  }, []);

  useEffect(() => {
    loadTopSoldCardTypes();
  }, [loadTopSoldCardTypes]);

  // The server only ever returns discounted tiers to individual-role users
  // (discounts never apply to business pricing), so this naturally comes
  // back empty for business accounts and the section just hides itself.
  const loadTopDiscountedTiers = useCallback(async () => {
    try {
      const data = await getTopDiscountedCardTiers();
      setTopDiscountedTiers(Array.isArray(data) ? data : []);
    } catch {
      setTopDiscountedTiers([]);
    } finally {
      setIsLoadingRails(false);
    }
  }, []);

  useEffect(() => {
    loadTopDiscountedTiers();
  }, [loadTopDiscountedTiers]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadDeals(),
      loadTopSoldCardTypes(),
      loadTopDiscountedTiers(),
    ]);
    setIsRefreshing(false);
  }, [loadDeals, loadTopSoldCardTypes, loadTopDiscountedTiers]);

  const handleBrowseCardsPress = useCallback(() => {
    router.push("/cards");
  }, [router]);

  const handleTopSoldCardPress = useCallback(
    (id) => {
      router.push(`/cards/${id}`);
    },
    [router],
  );

  const handleDiscountCardPress = useCallback(
    (typeId) => {
      router.push(`/cards/${typeId}`);
    },
    [router],
  );

  useEffect(() => {
    if (deals.length < 2) return undefined;

    const intervalId = setInterval(() => {
      setActivePromoIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % deals.length;
        promoListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [deals.length]);

  const handlePromoScrollEnd = useCallback(
    (event) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / promoCardWidth,
      );
      setActivePromoIndex(index);
    },
    [promoCardWidth],
  );

  const handlePromoPress = useCallback(
    (item) => {
      if (!item?.link) return;
      if (item.link.startsWith("/")) {
        router.push(item.link);
      } else {
        Linking.openURL(item.link).catch(() => {});
      }
    },
    [router],
  );

  const renderPromoItem = useCallback(
    ({ item }) => (
      <PromoCarouselCard
        item={item}
        onPress={handlePromoPress}
        width={promoCardWidth}
      />
    ),
    [handlePromoPress, promoCardWidth],
  );

  const renderDiscountItem = useCallback(
    ({ item }) => (
      <DiscountCardItem
        item={item}
        onPress={handleDiscountCardPress}
        gradients={gradients}
        isDark={isDark}
      />
    ),
    [handleDiscountCardPress, gradients, isDark],
  );

  const renderTopSoldItem = useCallback(
    ({ item, index }) => (
      <TopSoldCardItem
        item={item}
        rank={index}
        palette={palette}
        onPress={handleTopSoldCardPress}
        locale={locale}
      />
    ),
    [palette, handleTopSoldCardPress, locale],
  );

  const railSkeleton = useMemo(
    () => (
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: SCREEN_PADDING,
        }}
      >
        {[0, 1, 2].map((key) => (
          <Shimmer
            key={key}
            width={DISCOUNT_CARD_WIDTH}
            height={210}
            radius={Radii.xl}
          />
        ))}
      </View>
    ),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
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
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 132 }}
        >
          <Animated.View entering={FadeInDown.duration(450)}>
            <GreetingBar profile={profile} />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(450).delay(80)}
            style={{ marginTop: 20 }}
          >
            <PressableScale
              onPress={handleBrowseCardsPress}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={t("home.browseCards")}
              style={[
                { marginHorizontal: SCREEN_PADDING, borderRadius: Radii.xl },
                glow(palette.accentAlt, {
                  opacity: 0.35,
                  radius: 18,
                  y: 8,
                  elevation: 8,
                  isDark,
                }),
              ]}
            >
              <GlowCard
                radius={Radii.xl}
                tone={palette.accentAlt}
                intensity="soft"
                contentStyle={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  gap: 14,
                }}
              >
                <LinearGradient
                  colors={gradients.violet}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: Radii.lg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source={browseCardsImage}
                    style={{ width: 42, height: 42 }}
                    contentFit="contain"
                  />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 17,
                      fontFamily: FontFamily.bold,
                      color: palette.text,
                    }}
                  >
                    {t("home.browseCards")}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 3,
                      fontSize: 12,
                      fontFamily: FontFamily.regular,
                      color: palette.textMuted,
                    }}
                  >
                    {t("home.browseSubtitle")}
                  </Text>
                </View>
                <Ionicons
                  name={isRTL ? "chevron-back" : "chevron-forward"}
                  size={20}
                  color={palette.textFaint}
                />
              </GlowCard>
            </PressableScale>
          </Animated.View>

          {deals.length > 0 ? (
            <Animated.View
              entering={FadeInDown.duration(450).delay(140)}
              style={{ marginTop: 24 }}
            >
              <FlatList
                ref={promoListRef}
                data={deals}
                keyExtractor={(item) => item._id}
                renderItem={renderPromoItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToInterval={promoCardWidth + 12}
                decelerationRate="fast"
                disableIntervalMomentum
                contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING }}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                onMomentumScrollEnd={handlePromoScrollEnd}
                getItemLayout={(_, index) => ({
                  length: promoCardWidth + 12,
                  offset: (promoCardWidth + 12) * index,
                  index,
                })}
                initialScrollIndex={0}
                ListFooterComponent={<View style={{ width: 12 }} />}
              />
              {deals.length > 1 ? (
                <View
                  style={{
                    marginTop: 14,
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {deals.map((deal, index) =>
                    activePromoIndex === index ? (
                      <LinearGradient
                        key={deal._id}
                        colors={gradients.brand}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          width: 24,
                          height: 7,
                          borderRadius: Radii.pill,
                        }}
                      />
                    ) : (
                      <View
                        key={deal._id}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: Radii.pill,
                          backgroundColor: palette.borderStrong,
                        }}
                      />
                    ),
                  )}
                </View>
              ) : null}
            </Animated.View>
          ) : null}

          {isLoadingRails && topDiscountedTiers.length === 0 ? (
            <View style={{ marginTop: 28 }}>{railSkeleton}</View>
          ) : null}

          {topDiscountedTiers.length > 0 ? (
            <Animated.View
              entering={FadeInDown.duration(450).delay(200)}
              style={{ marginTop: 28 }}
            >
              <SectionHeader
                title={t("home.discountsTitle")}
                subtitle={t("home.discountsSubtitle")}
                style={{ marginHorizontal: SCREEN_PADDING, marginBottom: 14 }}
              />
              <FlatList
                data={topDiscountedTiers}
                keyExtractor={(item) => item.tierId}
                renderItem={renderDiscountItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING }}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
            </Animated.View>
          ) : null}

          {topSoldCardTypes.length > 0 ? (
            <Animated.View
              entering={FadeInDown.duration(450).delay(260)}
              style={{ marginTop: 28 }}
            >
              <SectionHeader
                title={t("home.bestSellersTitle")}
                subtitle={t("home.bestSellersSubtitle")}
                actionLabel={t("home.browseCards")}
                onActionPress={handleBrowseCardsPress}
                style={{ marginHorizontal: SCREEN_PADDING, marginBottom: 14 }}
              />
              <FlatList
                data={topSoldCardTypes}
                keyExtractor={(item) => item._id}
                renderItem={renderTopSoldItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING }}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Home;
