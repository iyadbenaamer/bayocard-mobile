import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SearchIcon from "../../assets/icons/search.svg";
import CartFab from "../../components/CartFab";
import NotificationsHeaderButton from "../../components/NotificationsHeaderButton";
import ScreenTitle from "../../components/Title";
import WalletHeaderButton from "../../components/WalletHeaderButton";
import AmbientBackdrop from "../../components/arcade/AmbientBackdrop";
import Chip from "../../components/arcade/Chip";
import GlowCard from "../../components/arcade/GlowCard";
import PressableScale from "../../components/arcade/Pressable";
import Shimmer from "../../components/arcade/Shimmer";
import { FontFamily } from "../../constants/fonts";
import { Radii, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import { getCardCategories } from "../../services/cardCategoryApi";
import { getCardTypesByCategory } from "../../services/cardTypeApi";
import { searchCardTypes } from "../../services/searchApi";
import getLocalizedText from "../../utils/localizedText";

const SCREEN_PADDING = 24;
const GRID_GAP = 12;

// البطاقة
const CardTypeItem = React.memo(
  ({ item, index, cardSize, placeholderImage, palette, onPress, locale }) => {
    const imageUri = item.image
      ? `${process.env.EXPO_PUBLIC_API_URL}${item.image}`
      : placeholderImage;
    const isLastInRow = (index + 1) % 3 === 0;

    return (
      <PressableScale
        onPress={() => onPress(item._id)}
        scaleTo={0.94}
        style={{
          width: cardSize,
          marginBottom: 18,
          marginRight: isLastInRow ? 0 : GRID_GAP,
        }}
      >
        <GlowCard
          radius={Radii.lg}
          intensity="soft"
          contentStyle={{ padding: 0 }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: cardSize - 2 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item._id}
          />
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
          {getLocalizedText(item.name, locale)}
        </Text>
      </PressableScale>
    );
  },
);

const CardSkeletonItem = React.memo(({ cardSize, index }) => {
  const isLastInRow = (index + 1) % 3 === 0;

  return (
    <View
      style={{
        width: cardSize,
        marginBottom: 18,
        marginRight: isLastInRow ? 0 : GRID_GAP,
      }}
    >
      <Shimmer width={cardSize} height={cardSize} radius={Radii.lg} />
      <Shimmer
        width={cardSize * 0.7}
        height={10}
        radius={Radii.xs}
        style={{ marginTop: 10, alignSelf: "center" }}
      />
    </View>
  );
});

export const BrowseCards = () => {
  const router = useRouter();
  const { palette, isDark } = usePalette();
  const { t, locale } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [cardTypes, setCardTypes] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(true);

  const cardSize = useMemo(() => {
    const { width } = Dimensions.get("window");
    const contentWidth = width - SCREEN_PADDING * 2;
    return Math.floor((contentWidth - GRID_GAP * 2) / 3);
  }, []);

  const placeholderImage = "https://via.placeholder.com/200x140?text=Card";

  const skeletonData = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ _id: `skeleton-${i}` })),
    [],
  );

  const displayedCardTypes = useMemo(() => {
    if (searchQuery.trim()) return searchResults;
    if (isLoading && cardTypes.length === 0 && !isRefreshing)
      return skeletonData;
    return cardTypes;
  }, [
    cardTypes,
    searchQuery,
    searchResults,
    isLoading,
    isRefreshing,
    skeletonData,
  ]);

  const loadCategories = useCallback(async () => {
    setCategoryLoading(true);
    try {
      const data = await getCardCategories();
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
      if (!selectedCategoryId && list.length) {
        setSelectedCategoryId(list[0]._id);
      }
      return list;
    } catch {
      setCategories([]);
      return [];
    } finally {
      setCategoryLoading(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadCardTypes = useCallback(
    async (nextPage = 1, replace = false) => {
      if (!selectedCategoryId) return;

      if (nextPage === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      setErrorMessage("");
      try {
        const data = await getCardTypesByCategory({
          categoryId: selectedCategoryId,
          page: nextPage,
          limit: 10,
        });
        const list = Array.isArray(data?.cardTypes) ? data.cardTypes : [];
        setCardTypes((prev) => (replace ? list : [...prev, ...list]));
        setHasMore(list.length === 10);
        setPage(nextPage);
      } catch {
        setErrorMessage(t("cardsList.errorLoadCardTypes"));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedCategoryId],
  );

  useEffect(() => {
    if (!selectedCategoryId) return;
    setCardTypes([]);
    setPage(1);
    setHasMore(true);
    loadCardTypes(1, true);
  }, [selectedCategoryId, loadCardTypes]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setIsSearching(false);
      setSearchError("");
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError("");

    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchCardTypes(trimmed);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchError(t("cardsList.errorSearchCards"));
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLoadMore = useCallback(() => {
    if (searchQuery.trim() || isLoadingMore || isLoading || !hasMore) return;
    loadCardTypes(page + 1);
  }, [searchQuery, isLoadingMore, isLoading, hasMore, page, loadCardTypes]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const categoriesList = await loadCategories();
    const activeCategoryId = selectedCategoryId || categoriesList[0]?._id;

    if (searchQuery.trim()) {
      setSearchError("");
      setIsSearching(true);
      try {
        const data = await searchCardTypes(searchQuery.trim());
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchError(t("cardsList.errorSearchCards"));
      } finally {
        setIsSearching(false);
      }
    } else if (activeCategoryId) {
      setSelectedCategoryId(activeCategoryId);
      await loadCardTypes(1, true);
    }
    setIsRefreshing(false);
  }, [loadCategories, searchQuery, selectedCategoryId, loadCardTypes]);

  const handleCategoryPress = useCallback((id) => {
    setSelectedCategoryId(id);
  }, []);

  const handleCardPress = useCallback(
    (id) => {
      router.push(`/cards/${id}`);
    },
    [router],
  );

  const renderCardType = useCallback(
    ({ item, index }) => {
      if (item._id.startsWith("skeleton-")) {
        return <CardSkeletonItem cardSize={cardSize} index={index} />;
      }
      return (
        <CardTypeItem
          item={item}
          index={index}
          cardSize={cardSize}
          placeholderImage={placeholderImage}
          palette={palette}
          locale={locale}
          onPress={handleCardPress}
        />
      );
    },
    [cardSize, palette, handleCardPress, locale],
  );

  const emptyMessage = () => {
    if (isLoading || isSearching) return null;
    const message = searchError
      ? searchError
      : errorMessage && !searchQuery.trim()
        ? errorMessage
        : searchQuery.trim()
          ? t("cardsList.noSearchResults")
          : t("cardsList.noCardsInCategory");
    const isError = Boolean(searchError || (errorMessage && !searchQuery.trim()));

    return (
      <Text
        style={{
          paddingHorizontal: SCREEN_PADDING,
          marginTop: 24,
          textAlign: "center",
          color: isError ? palette.danger : palette.textMuted,
          fontFamily: FontFamily.regular,
        }}
      >
        {message}
      </Text>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <FlatList
          data={displayedCardTypes}
          keyExtractor={(item) => item._id}
          renderItem={renderCardType}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          numColumns={3}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          maxToRenderPerBatch={12}
          windowSize={5}
          initialNumToRender={12}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <View
                style={{
                  paddingHorizontal: SCREEN_PADDING,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <ScreenTitle back>{t("cardsList.title")}</ScreenTitle>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <NotificationsHeaderButton />
                  <WalletHeaderButton />
                </View>
              </View>

              <View
                style={{
                  paddingHorizontal: SCREEN_PADDING,
                  marginTop: 16,
                  marginBottom: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 14,
                    height: 46,
                    borderRadius: Radii.pill,
                    backgroundColor: palette.surface,
                    borderWidth: 1.5,
                    // A lit ring on focus is the whole feedback mechanism
                    // here - there is no separate submit button.
                    borderColor: isSearchFocused
                      ? withAlpha(palette.accent, 0.85)
                      : withAlpha(palette.borderStrong, isDark ? 0.9 : 1),
                  }}
                >
                  <SearchIcon
                    width={17}
                    height={17}
                    color={isSearchFocused ? palette.accent : palette.textFaint}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: palette.text,
                      fontFamily: FontFamily.regular,
                    }}
                    placeholder={t("cardsList.searchPlaceholder")}
                    placeholderTextColor={palette.textFaint}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                  {isSearching ? (
                    <ActivityIndicator size="small" color={palette.accent} />
                  ) : null}
                </View>
              </View>

              {categoryLoading && categories.length === 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    paddingHorizontal: SCREEN_PADDING,
                    marginBottom: 16,
                  }}
                >
                  {[0, 1, 2].map((key) => (
                    <Shimmer
                      key={key}
                      width={86}
                      height={36}
                      radius={Radii.pill}
                    />
                  ))}
                </View>
              ) : categories.length === 0 ? (
                <Text
                  style={{
                    paddingHorizontal: SCREEN_PADDING,
                    marginBottom: 16,
                    color: palette.textMuted,
                    fontFamily: FontFamily.regular,
                  }}
                >
                  {t("cardsList.noCategoriesAvailable")}
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: SCREEN_PADDING,
                    gap: 8,
                    paddingBottom: 16,
                  }}
                >
                  {categories.map((item) => (
                    <Chip
                      key={item._id}
                      label={getLocalizedText(item.name, locale)}
                      active={item._id === selectedCategoryId}
                      onPress={() => handleCategoryPress(item._id)}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          }
          ListFooterComponent={
            isLoadingMore && !searchQuery.trim() ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator color={palette.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={emptyMessage()}
          columnWrapperStyle={{
            paddingHorizontal: SCREEN_PADDING,
            justifyContent: "flex-start",
          }}
          contentContainerStyle={{ paddingBottom: 132 }}
        />
      </SafeAreaView>
      <CartFab />
    </View>
  );
};

export default BrowseCards;
