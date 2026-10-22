import { memo, useCallback } from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Timing rather than a spring, so the scale settles on its target instead
// of overshooting and rebounding on every tap.
const PRESS_IN = { duration: 90, easing: Easing.out(Easing.quad) };
const PRESS_OUT = { duration: 140, easing: Easing.out(Easing.quad) };

/**
 * The app's standard touch target: a spring "press-in" scale instead of
 * TouchableOpacity's flat fade, because the arcade look leans on things
 * feeling physical.
 *
 * The animation is started from the press handlers and the worklet only
 * reads the resulting value. Driving it the other way round - calling
 * withTiming *inside* useAnimatedStyle - re-declares the animation every time
 * the style is evaluated, so it restarts from wherever it had got to instead
 * of running once to completion. With one of these behind every tile in a
 * catalog grid that turned each tap into a burst of redundant UI-thread work.
 *
 * Deliberately silent - no haptic feedback. Taps here are ordinary
 * navigation and list interactions, and buzzing on every one of them is
 * noise rather than signal.
 */
export const PressableScale = memo(
  ({ children, onPress, scaleTo = 0.96, style, disabled, ...rest }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
      scale.value = withTiming(scaleTo, PRESS_IN);
    }, [scale, scaleTo]);

    const handlePressOut = useCallback(() => {
      scale.value = withTiming(1, PRESS_OUT);
    }, [scale]);

    return (
      <AnimatedPressable
        {...rest}
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[style, animatedStyle, disabled ? { opacity: 0.55 } : null]}
      >
        {children}
      </AnimatedPressable>
    );
  },
);

PressableScale.displayName = "PressableScale";

export default PressableScale;
