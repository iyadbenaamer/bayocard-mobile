import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/theme";
import { useColorScheme } from "../hooks/use-color-scheme";

import AmbientBackdrop from "./arcade/AmbientBackdrop";
import { useTabBarVisibility } from "./TabBarVisibilityContext";

const AutoHideTabBarScrollView = ({
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

  // See AutoHideTabBarFlatList.jsx - without re-showing on focus, hiding
  // the bar on one screen leaves it stuck hidden after navigating back to
  // this one, since nothing else would ever trigger a show here.
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

  // The ambient glow lives here rather than in each screen so every scroll
  // view in the app sits on the same lit ground for free.
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          {...props}
          style={[{ backgroundColor: "transparent" }, style]}
          contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle}
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

export default AutoHideTabBarScrollView;
