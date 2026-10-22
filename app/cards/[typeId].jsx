import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import { getCardTypeById } from "@/services/cardTypeApi";
import AutoHideTabBarScrollView from "../../components/AutoHideTabBarScrollView";
import CartFab from "../../components/CartFab";
import { useRequireAuth } from "../../components/RequireAuth";
import ScreenTitle from "../../components/Title";
import Badge from "../../components/arcade/Badge";
import GlowCard from "../../components/arcade/GlowCard";
import NeonButton from "../../components/arcade/NeonButton";
import PressableScale from "../../components/arcade/Pressable";
import Shimmer from "../../components/arcade/Shimmer";
import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import { checkCartAvailability } from "../../services/cartApi";
import {
  addFavorite as addFavoriteApi,
  getFavorites,
  removeFavorite as removeFavoriteApi,
} from "../../services/favoriteApi";
import {
  addItem,
  applyAvailability,
  removeItem,
  selectCartItems,
  selectCartWarnings,
  updateItemQuantity,
} from "../../state/cartSlice";
import {
  addFavoriteId,
  removeFavoriteId,
  selectFavoriteIds,
  setFavoriteIds,
} from "../../state/favoritesSlice";
import { selectUserProfile } from "../../state/store";
import getLocalizedText from "../../utils/localizedText";

const SCREEN_PADDING = 24;

// ─── Quantity Stepper ────────────────────────────────────────────────────────
const StepButton = ({ symbol, onPress, label }) => {
  const { palette, isDark } = usePalette();

  return (
    <PressableScale
      onPress={onPress}
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

const QuantityStepper = ({ value, onDecrement, onIncrement }) => {
  const { palette } = usePalette();
  const { t } = useTranslation();

  return (
    <View style={styles.stepper}>
      <StepButton
        symbol="−"
        onPress={onDecrement}
        label={t("cardDetail.decreaseQuantityLabel")}
      />
      <Text
        style={{
          fontSize: 15,
          minWidth: 24,
          textAlign: "center",
          color: palette.text,
          fontFamily: FontFamily.bold,
        }}
      >
        {value}
      </Text>
      <StepButton
        symbol="+"
        onPress={onIncrement}
        label={t("cardDetail.increaseQuantityLabel")}
      />
    </View>
  );
};

// ─── Card art hero ───────────────────────────────────────────────────────────

/**
 * The card artwork was never shown on this screen before - people arrived
 * from a grid of images and landed on a wall of text. Repeating the art
 * confirms they opened the right product before they commit to a price.
 */
const CardHero = ({ cardType, locale, gradients, palette, isDark, t }) => {
  const imageUri = cardType.image
    ? `${process.env.EXPO_PUBLIC_API_URL}${cardType.image}`
    : null;

  return (
    <View
      style={[
        { marginTop: 8, borderRadius: Radii.xl },
        glow(palette.primary, {
          opacity: 0.4,
          radius: 20,
          y: 10,
          elevation: 10,
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
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: withAlpha("#FFFFFF", isDark ? 0.12 : 0.24),
        }}
      >
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: Radii.lg,
            overflow: "hidden",
            backgroundColor: withAlpha("#FFFFFF", 0.14),
            borderWidth: 2,
            borderColor: withAlpha("#FFFFFF", 0.7),
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={cardType._id}
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="card" size={30} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{
              color: "#FFFFFF",
              fontFamily: FontFamily.bold,
              fontSize: 19,
            }}
          >
            {getLocalizedText(cardType.name, locale)}
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: withAlpha("#FFFFFF", 0.75),
              fontFamily: FontFamily.regular,
              fontSize: 12,
            }}
          >
            {t("cardDetail.tierCount", {
              count: cardType.tiers?.length ?? 0,
            })}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// ─── Screen ──────────────────────────────────────────────────────────────────

const CardTypeTiers = () => {
  const authStatus = useRequireAuth();
  const { typeId } = useLocalSearchParams();
  const { palette, gradients, isDark } = usePalette();
  const dispatch = useDispatch();
  const { t, isRTL, locale } = useTranslation();

  const [cardType, setCardType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [isFavoritePending, setIsFavoritePending] = useState(false);

  const cartItems = useSelector(selectCartItems);
  const warnings = useSelector(selectCartWarnings);
  const user = useSelector(selectUserProfile);
  const favoriteIds = useSelector(selectFavoriteIds);
  const isFavorite = Boolean(cardType && favoriteIds.includes(cardType._id));

  const loadCardType = useCallback(
    async (refresh = false) => {
      if (!typeId) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const data = await getCardTypeById(typeId);
        setCardType(data);
      } catch {
        setCardType(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [typeId],
  );

  useEffect(() => {
    loadCardType(false);
  }, [loadCardType]);

  const handleRefresh = useCallback(async () => {
    await loadCardType(true);
  }, [loadCardType]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getFavorites();
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        dispatch(setFavoriteIds(list.map((favorite) => favorite.cardTypeId)));
      } catch {
        // Favorite badge just won't reflect state; safe to ignore.
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  const handleToggleFavorite = useCallback(async () => {
    if (!cardType || isFavoritePending) return;
    setIsFavoritePending(true);
    try {
      if (isFavorite) {
        await removeFavoriteApi(cardType._id);
        dispatch(removeFavoriteId(cardType._id));
      } else {
        await addFavoriteApi(cardType._id);
        dispatch(addFavoriteId(cardType._id));
      }
    } catch {
      // Network/validation error; leave favorite state unchanged.
    } finally {
      setIsFavoritePending(false);
    }
  }, [cardType, isFavorite, isFavoritePending, dispatch]);

  const runAvailabilityCheck = useCallback(
    async (updatedItems) => {
      if (!updatedItems.length) return;
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
        setAddingId(null);
      }
    },
    [dispatch],
  );

  const handleAddToCart = useCallback(
    async (tier) => {
      setAddingId(tier._id);
      dispatch(
        addItem({
          id: tier._id,
          title: getLocalizedText(tier.title, locale),
          typeName: getLocalizedText(cardType?.name, locale),
          buyPrice: tier.buyPrice,
          sellPrice: tier.sellPrice,
          quantity: 1,
        }),
      );

      const updatedItems = [...cartItems, { id: tier._id, quantity: 1 }];
      runAvailabilityCheck(updatedItems);
    },
    [dispatch, cartItems, cardType, locale, runAvailabilityCheck],
  );

  const handleDecrement = useCallback(
    (tierId) => {
      setAddingId(tierId);
      const item = cartItems.find((i) => i.id === tierId);
      if (!item) return;

      const newQty = item.quantity - 1;
      if (newQty <= 0) {
        dispatch(removeItem(tierId));
        setAddingId(null);
      } else {
        dispatch(updateItemQuantity({ id: tierId, quantity: newQty }));
        const updated = cartItems
          .map((i) => (i.id === tierId ? { ...i, quantity: newQty } : i))
          .filter((i) => i.quantity > 0);
        runAvailabilityCheck(updated);
      }
    },
    [dispatch, cartItems, runAvailabilityCheck],
  );

  const handleIncrement = useCallback(
    (tierId) => {
      setAddingId(tierId);
      const item = cartItems.find((i) => i.id === tierId);
      if (!item) return;

      const newQty = item.quantity + 1;
      dispatch(updateItemQuantity({ id: tierId, quantity: newQty }));
      const updated = cartItems.map((i) =>
        i.id === tierId ? { ...i, quantity: newQty } : i,
      );
      runAvailabilityCheck(updated);
    },
    [dispatch, cartItems, runAvailabilityCheck],
  );

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

  const cartQtyMap = Object.fromEntries(
    cartItems.map((i) => [i.id, i.quantity]),
  );
  const warningMap = Object.fromEntries(
    warnings.map((w) => [w.tierId, w.message]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AutoHideTabBarScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: 132,
        }}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <ScreenTitle back>
              {getLocalizedText(cardType?.name, locale) ||
                t("cardDetail.categoriesFallback")}
            </ScreenTitle>
          </View>
          {cardType ? (
            <PressableScale
              onPress={handleToggleFavorite}
              disabled={isFavoritePending}
              scaleTo={0.85}
              accessibilityLabel={
                isFavorite
                  ? t("cardDetail.removeFromFavoritesLabel")
                  : t("cardDetail.addToFavoritesLabel")
              }
              // No elevation here on purpose: Android draws an elevation
              // shadow from the view outline, and against this translucent
              // fill that surfaced as a pale halo under the heart.
              style={{
                width: 42,
                height: 42,
                borderRadius: Radii.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha(
                  palette.danger,
                  isFavorite ? (isDark ? 0.22 : 0.14) : isDark ? 0.1 : 0.07,
                ),
                borderWidth: 1,
                borderColor: withAlpha(palette.danger, isFavorite ? 0.6 : 0.25),
              }}
            >
              {isFavoritePending ? (
                <ActivityIndicator size="small" color={palette.danger} />
              ) : (
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={20}
                  color={palette.danger}
                />
              )}
            </PressableScale>
          ) : null}
        </View>

        {isLoading ? (
          <View style={{ gap: 12, marginTop: 12 }}>
            <Shimmer
              height={116}
              radius={Radii.xl}
              style={{ alignSelf: "stretch" }}
            />
            {[0, 1, 2, 3].map((key) => (
              <Shimmer
                key={key}
                height={78}
                radius={Radii.lg}
                style={{ alignSelf: "stretch" }}
              />
            ))}
          </View>
        ) : !cardType ? (
          <Text
            style={{
              marginTop: 16,
              color: palette.danger,
              fontFamily: FontFamily.regular,
            }}
          >
            {t("cardDetail.errorLoadCategories")}
          </Text>
        ) : (
          <>
            <CardHero
              cardType={cardType}
              locale={locale}
              gradients={gradients}
              palette={palette}
              isDark={isDark}
              t={t}
            />

            {cardType.tiers?.length ? (
              <View style={{ marginTop: 18, gap: 12 }}>
                {cardType.tiers.map((tier) => {
                  const inCart = cartQtyMap[tier._id] ?? 0;
                  const isAvailable = tier.isAvailable !== false;
                  const isAdding = addingId === tier._id;
                  const isDiscounted = tier.discountPercentage > 0;

                  return (
                    <View
                      key={tier._id}
                      style={{
                        gap: 8,
                        opacity: isAvailable ? 1 : 0.55,
                        marginTop: isDiscounted ? 8 : 0,
                      }}
                    >
                      <View>
                        <GlowCard
                          radius={Radii.lg}
                          tone={
                            inCart > 0
                              ? palette.primary
                              : isDiscounted
                                ? palette.highlight
                                : palette.border
                          }
                          intensity={inCart > 0 ? "strong" : "soft"}
                          contentStyle={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            padding: 14,
                          }}
                        >
                          {/* Tier info */}
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                color: palette.text,
                                fontFamily: FontFamily.bold,
                                fontSize: 15,
                              }}
                            >
                              {getLocalizedText(tier.title, locale)}
                            </Text>
                            <View style={{ marginTop: 4 }}>
                              {user?.role === "individual" ? (
                                isDiscounted ? (
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: palette.textFaint,
                                        fontFamily: FontFamily.regular,
                                        fontSize: 12,
                                        textDecorationLine: "line-through",
                                      }}
                                    >
                                      {t("cardDetail.priceWithCurrency", {
                                        price: tier.sellPrice,
                                      })}
                                    </Text>
                                    <Text
                                      style={{
                                        color: palette.highlight,
                                        fontFamily: FontFamily.bold,
                                        fontSize: 15,
                                      }}
                                    >
                                      {t("cardDetail.priceWithCurrency", {
                                        price: tier.buyPrice,
                                      })}
                                    </Text>
                                  </View>
                                ) : (
                                  <Text
                                    style={{
                                      color: palette.text,
                                      fontFamily: FontFamily.bold,
                                      fontSize: 14,
                                    }}
                                  >
                                    {t("cardDetail.priceLabel", {
                                      price: tier.sellPrice,
                                    })}
                                  </Text>
                                )
                              ) : (
                                <>
                                  <Text
                                    style={{
                                      color: palette.textMuted,
                                      fontFamily: FontFamily.regular,
                                      fontSize: 12,
                                    }}
                                  >
                                    {t("cardDetail.buyPriceLabel", {
                                      price: tier.buyPrice,
                                    })}
                                  </Text>
                                  <Text
                                    style={{
                                      color: palette.textMuted,
                                      fontFamily: FontFamily.regular,
                                      fontSize: 12,
                                    }}
                                  >
                                    {t("cardDetail.sellPriceLabel", {
                                      price: tier.sellPrice,
                                    })}
                                  </Text>
                                </>
                              )}
                            </View>
                          </View>

                          {/* Add to cart / Stepper / Out of stock — only for logged-in users */}
                          {user &&
                            (!isAvailable ? (
                              <View
                                style={[
                                  styles.outOfStockBadge,
                                  {
                                    borderColor: withAlpha(palette.danger, 0.4),
                                    backgroundColor: withAlpha(
                                      palette.danger,
                                      0.12,
                                    ),
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    color: palette.danger,
                                    fontFamily: FontFamily.bold,
                                    fontSize: 12,
                                  }}
                                >
                                  {t("cardDetail.outOfStock")}
                                </Text>
                              </View>
                            ) : inCart > 0 ? (
                              <View style={styles.stepperContainer}>
                                {isAdding ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={palette.primary}
                                    style={{ width: 106 }}
                                  />
                                ) : (
                                  <QuantityStepper
                                    value={inCart}
                                    onDecrement={() =>
                                      handleDecrement(tier._id)
                                    }
                                    onIncrement={() =>
                                      handleIncrement(tier._id)
                                    }
                                  />
                                )}
                              </View>
                            ) : (
                              <NeonButton
                                label={t("cardDetail.addToCart")}
                                size="sm"
                                loading={isAdding}
                                onPress={() => handleAddToCart(tier)}
                                accessibilityLabel={t(
                                  "cardDetail.addToCartLabel",
                                  {
                                    title: getLocalizedText(tier.title, locale),
                                  },
                                )}
                                style={{ minWidth: 106 }}
                              />
                            ))}
                        </GlowCard>

                        {isDiscounted ? (
                          <View
                            style={[
                              styles.discountBadge,
                              isRTL ? { right: 12 } : { left: 12 },
                            ]}
                          >
                            <Badge
                              label={t("cardDetail.discountLabel", {
                                percentage: tier.discountPercentage,
                              })}
                              icon={
                                <Ionicons name="flash" size={10} color="#fff" />
                              }
                              gradient={gradients.heat}
                              tone={palette.highlight}
                            />
                          </View>
                        ) : null}
                      </View>

                      {warningMap[tier._id] && (
                        <View
                          style={[
                            styles.warningBox,
                            {
                              backgroundColor: withAlpha(palette.warning, 0.12),
                              borderColor: withAlpha(palette.warning, 0.5),
                            },
                          ]}
                        >
                          <Ionicons
                            name="warning"
                            size={14}
                            color={palette.warning}
                          />
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 12,
                              color: palette.warning,
                              fontFamily: FontFamily.regular,
                            }}
                          >
                            {warningMap[tier._id]}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text
                style={{
                  marginTop: 20,
                  color: palette.textMuted,
                  fontFamily: FontFamily.regular,
                }}
              >
                {t("cardDetail.noTiersAvailable")}
              </Text>
            )}
          </>
        )}
      </AutoHideTabBarScrollView>
      <CartFab />
    </View>
  );
};

const styles = StyleSheet.create({
  discountBadge: {
    position: "absolute",
    top: -10,
    zIndex: 2,
  },
  warningBox: {
    borderRadius: Radii.sm,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  outOfStockBadge: {
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 106,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperContainer: {
    minWidth: 106,
    alignItems: "center",
    justifyContent: "center",
  },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
});

export default CardTypeTiers;
