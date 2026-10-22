import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";

import NotificationsHeaderButton from "../../components/NotificationsHeaderButton";
import ScreenTitle from "../../components/Title";
import WalletHeaderButton from "../../components/WalletHeaderButton";
import AmbientBackdrop from "../../components/arcade/AmbientBackdrop";
import GlowCard from "../../components/arcade/GlowCard";
import IconBubble from "../../components/arcade/IconBubble";
import NeonButton from "../../components/arcade/NeonButton";
import PressableScale from "../../components/arcade/Pressable";
import { FontFamily } from "../../constants/fonts";
import { Radii, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import { getFavorites } from "../../services/favoriteApi";
import { setFavoriteIds } from "../../state/favoritesSlice";
import getLocalizedText from "../../utils/localizedText";

const SCREEN_PADDING = 24;
const GRID_GAP = 12;
const placeholderImage = "https://via.placeholder.com/200x140?text=Card";

const FavoriteItem = React.memo(
  ({ item, index, cardSize, palette, onPress, locale }) => {
    const imageUri = item.cardTypeImage
      ? `${process.env.EXPO_PUBLIC_API_URL}${item.cardTypeImage}`
      : placeholderImage;
    const isLastInRow = (index + 1) % 3 === 0;

    return (
      <PressableScale
        onPress={() => onPress(item.cardTypeId)}
        scaleTo={0.94}
        style={{
          width: cardSize,
          marginBottom: 18,
          marginRight: isLastInRow ? 0 : GRID_GAP,
        }}
      >
        <GlowCard
          radius={Radii.lg}
          tone={palette.danger}
          intensity="soft"
          contentStyle={{ padding: 0 }}
        >
          <View style={{ width: "100%", height: cardSize - 2 }}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={item.cardTypeId}
            />
            {/* A heart pip marks these as saved without needing a caption. */}
            <View
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 22,
                height: 22,
                borderRadius: Radii.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: withAlpha("#000000", 0.5),
              }}
            >
              <Ionicons name="heart" size={12} color={palette.danger} />
            </View>
          </View>
        </GlowCard>
        <Text
          style={{
            marginTop: 8,
            fontSize: 12,
            textAlign: "center",
            color: palette.text,
            fontFamily: FontFamily.bold,
          }}
          numberOfLines={2}
        >
          {getLocalizedText(item.cardTypeName, locale)}
        </Text>
      </PressableScale>
    );
  },
);

export const Favorites = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { palette } = usePalette();
  const { t, locale } = useTranslation();

  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const cardSize = useMemo(() => {
    const { width } = Dimensions.get("window");
    const contentWidth = width - SCREEN_PADDING * 2;
    return Math.floor((contentWidth - GRID_GAP * 2) / 3);
  }, []);

  const fetchFavorites = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await getFavorites();
        const list = Array.isArray(data) ? data : [];
        setFavorites(list);
        dispatch(setFavoriteIds(list.map((favorite) => favorite.cardTypeId)));
      } catch {
        setErrorMessage(t("favorites.loadError"));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dispatch, t],
  );

  useFocusEffect(
    useCallback(() => {
      fetchFavorites(false);
    }, [fetchFavorites]),
  );

  const handleRefresh = useCallback(
    () => fetchFavorites(true),
    [fetchFavorites],
  );

  const handlePress = useCallback(
    (cardTypeId) => router.push(`/cards/${cardTypeId}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <FavoriteItem
        item={item}
        index={index}
        cardSize={cardSize}
        palette={palette}
        onPress={handlePress}
        locale={locale}
      />
    ),
    [cardSize, palette, handlePress, locale],
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <FlatList
          data={favorites}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View
              style={{
                paddingHorizontal: SCREEN_PADDING,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <ScreenTitle>{t("favorites.title")}</ScreenTitle>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <NotificationsHeaderButton />
                <WalletHeaderButton />
              </View>
            </View>
          }
          columnWrapperStyle={{
            paddingHorizontal: SCREEN_PADDING,
            justifyContent: "flex-start",
          }}
          contentContainerStyle={{ paddingBottom: 132 }}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <ActivityIndicator color={palette.primary} />
              </View>
            ) : (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 32,
                  paddingHorizontal: SCREEN_PADDING,
                  gap: 14,
                }}
              >
                <IconBubble size={64} tone={palette.danger}>
                  <Ionicons
                    name={errorMessage ? "alert-circle" : "heart-outline"}
                    size={30}
                    color={palette.danger}
                  />
                </IconBubble>
                <Text
                  style={{
                    textAlign: "center",
                    color: errorMessage ? palette.danger : palette.textMuted,
                    fontFamily: FontFamily.regular,
                  }}
                >
                  {errorMessage || t("favorites.emptyState")}
                </Text>
                {!errorMessage ? (
                  <NeonButton
                    label={t("home.browseCards")}
                    size="sm"
                    onPress={() => router.push("/cards")}
                  />
                ) : null}
              </View>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
};

export default Favorites;
