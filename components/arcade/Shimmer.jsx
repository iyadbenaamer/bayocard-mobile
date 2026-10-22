import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  makeMutable,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Radii } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";

const SWEEP_MS = 1200;

/**
 * One clock for every skeleton on screen.
 *
 * Each Shimmer used to own an infinite `withRepeat`, so a loading grid of a
 * dozen placeholders started a dozen independent repeating animations that
 * all ran until their row resolved. They were already in lockstep visually -
 * same duration, same linear easing - so nothing is lost by driving them
 * from a single shared value, and the UI thread now advances one animation
 * instead of N. It is reference-counted so the clock stops entirely once the
 * last skeleton unmounts, rather than ticking for the life of the process.
 */
const sweepClock = makeMutable(0);
let activeSweeps = 0;

const retainSweepClock = () => {
  activeSweeps += 1;
  if (activeSweeps === 1) {
    sweepClock.value = 0;
    sweepClock.value = withRepeat(
      withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }
};

const releaseSweepClock = () => {
  activeSweeps = Math.max(0, activeSweeps - 1);
  if (activeSweeps === 0) {
    cancelAnimation(sweepClock);
    sweepClock.value = 0;
  }
};

/**
 * Loading placeholder with a sweeping highlight. Replaces the old
 * opacity-pulse skeletons - a travelling band reads as "loading" much
 * faster than a fade, and it keeps the arcade feel while lists resolve.
 *
 * `width` must be a number for the sweep to be sized correctly; pass
 * `style={{ flex: 1 }}`-style layout on the parent instead if you need it
 * to stretch.
 */
export const Shimmer = memo(({ width, height, radius = Radii.md, style }) => {
  const { palette } = usePalette();

  useEffect(() => {
    retainSweepClock();
    return releaseSweepClock;
  }, []);

  const travel = width ?? 200;
  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: (sweepClock.value * 2 - 1) * travel }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: palette.shimmerBase,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[{ width: "100%", height: "100%" }, sweep]}>
        <LinearGradient
          colors={[
            palette.shimmerBase,
            palette.shimmerHighlight,
            palette.shimmerBase,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>
    </View>
  );
});

Shimmer.displayName = "Shimmer";

export default Shimmer;
