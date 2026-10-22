import { useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FontFamily } from "../../constants/fonts";
import { Radii, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";

// A short ease-out, not a spring: a spring overshoots its target and settles
// back, which on a panel this large reads as the sheet jumping.
const ENTER_MS = 240;

/**
 * Sheet that covers the bottom half of the screen, for short pickers that
 * would otherwise cost a whole screen push (theme, language).
 *
 * Two details keep it flush against the bottom edge:
 *   - The panel is pinned with `position: absolute` + `bottom: 0` rather than
 *     relying on being the last flex child, so nothing about the sibling
 *     scrim can push it up. `left: 0`/`right: 0` is a symmetric pair, so RN's
 *     RTL left/right swap cannot move it either.
 *   - Its height carries the bottom safe-area inset on top of the half
 *     viewport, so the background still reaches the screen edge on devices
 *     whose window height excludes the system navigation bar.
 *
 * The slide is driven from a shared value instead of Reanimated's
 * `SlideInDown` so the resting position is exactly `translateY: 0` - a
 * layout-animation builder resolves its own start and end offsets, which is
 * what leaves a sliver visible underneath when they disagree with the
 * window height. (`exiting` is not used: `Modal` unmounts its whole subtree
 * the moment `visible` flips, so an exit animation never gets to play.)
 */
export const BottomSheet = ({
  visible,
  title,
  subtitle,
  onClose,
  children,
}) => {
  const { palette, isDark } = usePalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const sheetHeight = height * 0.5 + insets.bottom;
  const translateY = useSharedValue(sheetHeight);

  useEffect(() => {
    if (visible) {
      translateY.value = sheetHeight;
      translateY.value = withTiming(0, {
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible, sheetHeight, translateY]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: withAlpha(
              isDark ? "#03060E" : "#0B1020",
              isDark ? 0.55 : 0.32,
            ),
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={title}
        />

        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: sheetHeight,
              backgroundColor: palette.surfaceElevated,
              borderTopLeftRadius: Radii.xxl,
              borderTopRightRadius: Radii.xxl,
              borderTopWidth: 1,
              paddingHorizontal: 22,
              paddingTop: 12,
            },
            panelStyle,
          ]}
        >
          {/* Grab handle - purely an affordance, the sheet is tap-to-close. */}
          <View
            style={{
              alignSelf: "center",
              width: 44,
              height: 5,
              borderRadius: Radii.pill,
              backgroundColor: palette.borderStrong,
              marginBottom: 18,
            }}
          />

          {title ? (
            <Text
              style={{
                fontSize: 19,
                color: palette.text,
                fontFamily: FontFamily.bold,
              }}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              style={{
                marginTop: 4,
                fontSize: 13,
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {subtitle}
            </Text>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              gap: 10,
              paddingTop: 18,
              // The panel runs past the system bar, so the inset is held off
              // the options here instead of shortening the background.
              paddingBottom: insets.bottom + 20,
            }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default BottomSheet;
