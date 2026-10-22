import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";
import { useColorScheme } from "../hooks/use-color-scheme";

import AmbientBackdrop from "./arcade/AmbientBackdrop";
import { useTabBarVisibility } from "./TabBarVisibilityContext";

// Virtualized counterpart to AutoHideTabBarScrollView. Screens with lists
// that grow via pagination (history, transactions, ...) must use this
// instead of a plain ScrollView + .map() - a ScrollView keeps every loaded
// row mounted forever, which is fine on a handful of items but degrades
// fast on the low-spec POS hardware this app primarily targets. FlatList
// only mounts what's near the viewport and recycles the rest.
const AutoHideTabBarFlatList = ({
  onScroll,
  scrollEventThrottle = 16,
  contentContainerStyle,
  style,
  refreshing = false,
  onRefresh,
  ...props
}) => {
  const { setHidden } = useTabBarVisibility();
  const theme = useColorScheme() ?? "light";
  const palette = Colors[theme];
  const lastOffsetRef = useRef(0);

  // The hidden/shown state lives in a single Animated.Value shared across
  // every tab (see (tabs)/_layout.jsx), but each screen only re-shows it on
  // an upward scroll of its own. Without this, hiding it on one tab (or on
  // a screen that ends up too short to scroll) leaves it stuck hidden after
  // switching back here, since nothing else would ever trigger a show.
  useFocusEffect(
    useCallback(() => {
      setHidden(false);
    }, [setHidden]),
  );

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const delta = offsetY - lastOffsetRef.current;

    if (delta > 10) {
      setHidden(true);
    } else if (delta < -10) {
      setHidden(false);
    }

    lastOffsetRef.current = offsetY;

    if (onScroll) {
      onScroll(event);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <FlatList
          {...props}
          style={[{ backgroundColor: "transparent" }, style]}
          contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={10}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.primary}
                colors={[palette.primary]}
                progressBackgroundColor={palette.surface}
              />
            ) : undefined
          }
        />
      </SafeAreaView>
    </View>
  );
};

export default AutoHideTabBarFlatList;
