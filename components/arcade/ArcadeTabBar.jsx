import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import PressableScale from "./Pressable";

const BAR_HEIGHT = 56;
const SIDE_MARGIN = 0;
const INDICATOR_INSET = 3;

// Timing, not a spring: a spring overshoots the slot it is travelling to
// and settles back, so the capsule visibly bounced past each tab.
const SLIDE = { duration: 220, easing: Easing.out(Easing.cubic) };

/**
 * Floating tab bar: a glass pill lifted off the bottom edge with a gradient
 * capsule that springs between tabs.
 *
 * RTL note - two separate mirrorings are in play and both have to be
 * cancelled out, or the capsule parks under the wrong tab:
 *   1. `flexDirection: "row"` is mirrored by Yoga, so tab 0 renders on the
 *      right. `visualIndex` counts slots from that visual start.
 *   2. RN swaps `left`/`right` in RTL styles by default
 *      (I18nManager.doLeftAndRightSwapInRTL), so an indicator anchored with
 *      `left: INSET` silently becomes `right: INSET` and every offset then
 *      measures from the wrong edge.
 * The indicator is therefore placed in a `left: 0 / right: 0` track - a
 * symmetric pair that survives the swap - centered with `alignItems`, and
 * moved by a translateX measured from the bar's centre. Transforms are
 * never mirrored, so that offset means the same thing in both directions.
 * CartFab positions itself the same way for the same reason.
 */
export const ArcadeTabBar = ({ state, descriptors, navigation }) => {
  const { palette, gradients, isDark } = usePalette();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const tabCount = state.routes.length;
  const slotWidth =
    barWidth > 0 ? (barWidth - INDICATOR_INSET * 2) / tabCount : 0;

  // Counted from the visual start of the row, which is the right-hand side
  // once Yoga mirrors the layout.
  const visualIndex = isRTL ? tabCount - 1 - state.index : state.index;

  // Distance from the bar's centre to the centre of the active slot.
  const targetOffset =
    slotWidth > 0
      ? INDICATOR_INSET + slotWidth * (visualIndex + 0.5) - barWidth / 2
      : 0;

  const offset = useDerivedValue(
    () => withTiming(targetOffset, SLIDE),
    [targetOffset],
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        paddingHorizontal: SIDE_MARGIN,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[
          {
            height: BAR_HEIGHT,
            borderRadius: Radii.pill,
            borderWidth: 1,
            borderColor: withAlpha(palette.borderStrong, isDark ? 0.95 : 1),
            overflow: "hidden",
            justifyContent: "center",
          },
          glow(isDark ? "#000" : palette.primary, {
            opacity: 0.55,
            radius: 22,
            y: 10,
            elevation: 16,
            isDark,
          }),
        ]}
      >
        <LinearGradient
          colors={gradients.tabBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {slotWidth > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: INDICATOR_INSET,
              bottom: INDICATOR_INSET,
              alignItems: "center",
            }}
          >
            <Animated.View
              style={[{ width: slotWidth, height: "100%" }, indicatorStyle]}
            >
              <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  { flex: 1, borderRadius: Radii.pill },
                  glow(palette.primary, {
                    opacity: 0.7,
                    radius: 14,
                    y: 4,
                    elevation: 8,
                    isDark,
                  }),
                ]}
              />
            </Animated.View>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const label = options.title ?? route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <PressableScale
                key={route.key}
                onPress={onPress}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                style={{
                  flex: 1,
                  height: BAR_HEIGHT,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: isFocused ? "#FFFFFF" : palette.tabIconDefault,
                  size: isFocused ? 21 : 22,
                })}
                {isFocused ? (
                  <Text
                    numberOfLines={1}
                    // Only the active tab shows its label, so it has one
                    // slot's width to fit a word like "Transactions" -
                    // shrink rather than clip it.
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={{
                      maxWidth: "94%",
                      textAlign: "center",
                      color: "#FFFFFF",
                      fontFamily: FontFamily.bold,
                      fontSize: 9,
                      letterSpacing: 0.2,
                    }}
                  >
                    {label}
                  </Text>
                ) : null}
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default ArcadeTabBar;
