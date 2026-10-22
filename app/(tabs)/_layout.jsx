import { Tabs } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { Animated } from "react-native";
import { RequireAuth } from "../../components/RequireAuth";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useTranslation } from "../../hooks/use-translation";

import ArcadeTabBar from "../../components/arcade/ArcadeTabBar";
import TabBarVisibilityContext from "../../components/TabBarVisibilityContext";

import CardIcon from "../../assets/icons/card.svg";
import FavoriteIcon from "../../assets/icons/favorite.svg";
import HomeIcon from "../../assets/icons/home.svg";
import ProfileIcon from "../../assets/icons/profile.svg";
import TransactionsIcon from "../../assets/icons/transactions.svg";
import CartFab from "../../components/CartFab";

// The floating bar sits clear of the screen edge, so it has further to
// travel off-screen than the old edge-to-edge bar did.
const HIDE_TRANSLATE_Y = 120;

export const TabLayout = () => {
  const theme = useColorScheme() ?? "light";
  const palette = Colors[theme];
  const { t } = useTranslation();
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const isHiddenRef = useRef(false);

  // Every scrolling screen calls this from its onScroll handler, which fires
  // up to 60x a second. Without the guard each of those frames kicked off a
  // fresh 220ms timing animation towards a target the bar was already
  // travelling to - so a single flick queued dozens of overlapping
  // animations, all of them driving the same value. Only act on an actual
  // change of state.
  const setHidden = useCallback(
    (hidden) => {
      if (isHiddenRef.current === hidden) return;
      isHiddenRef.current = hidden;

      Animated.timing(tabBarTranslateY, {
        toValue: hidden ? HIDE_TRANSLATE_Y : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    },
    [tabBarTranslateY],
  );

  const contextValue = useMemo(() => ({ setHidden }), [setHidden]);

  const tabBarWrapperStyle = useMemo(
    () => ({
      transform: [{ translateY: tabBarTranslateY }],
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
    }),
    [tabBarTranslateY],
  );

  const renderTabBar = useCallback(
    (props) => (
      <Animated.View style={tabBarWrapperStyle}>
        <ArcadeTabBar {...props} />
      </Animated.View>
    ),
    [tabBarWrapperStyle],
  );

  return (
    <RequireAuth>
      <TabBarVisibilityContext.Provider value={contextValue}>
        <Tabs
          screenOptions={{
            headerShown: false,
            animation: "shift",
            sceneStyle: {
              backgroundColor: palette.background,
            },
          }}
          tabBar={renderTabBar}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t("tabsLayout.home"),
              tabBarIcon: ({ color, size }) => (
                <HomeIcon width={size} height={size} stroke={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="favorites"
            options={{
              title: t("tabsLayout.favorites"),
              tabBarIcon: ({ color, size }) => (
                <FavoriteIcon width={size} height={size} stroke={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: t("tabsLayout.history"),
              tabBarIcon: ({ color, size }) => (
                <CardIcon width={size} height={size} stroke={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: t("tabsLayout.transactions"),
              tabBarIcon: ({ color, size }) => (
                <TransactionsIcon width={size} height={size} fill={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t("tabsLayout.profile"),
              tabBarIcon: ({ color, size }) => (
                <ProfileIcon width={size} height={size} color={color} />
              ),
            }}
          />
        </Tabs>
        <CartFab />
      </TabBarVisibilityContext.Provider>
    </RequireAuth>
  );
};

export default TabLayout;
