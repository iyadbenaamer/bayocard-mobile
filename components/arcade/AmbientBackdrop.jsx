import { memo, useId } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { usePalette } from "../../hooks/use-palette";

const GRID_STEP = 44;

/**
 * Ambient depth behind a screen: two soft light blooms and an optional
 * hairline grid, both sitting under the content at low opacity.
 *
 * The blooms are SVG radial gradients rather than plain rounded Views
 * because a flat circle at 12% opacity still shows a hard edge against the
 * near-black background; a real falloff is what makes it read as light
 * rather than as a shape.
 *
 * Performance shape - this mounts on essentially every screen in the app,
 * and the navigator keeps pushed-behind screens alive, so several instances
 * exist at once on the low-spec POS hardware this app targets. Three things
 * follow from that:
 *
 *   1. Everything lives in ONE <Svg>. Three separate ones (grid + a bloom
 *      each) meant three native views to allocate, measure and composite
 *      per screen for a purely decorative layer.
 *   2. The grid is a single <Rect> filled with a repeating <Pattern>, not
 *      one <Line> per gridline. A phone-height screen needed ~31 line nodes,
 *      each a separate shape to parse and draw; the pattern is drawn once by
 *      the rasterizer and tiled.
 *   3. It does not animate. The blooms used to drift on an infinite
 *      Reanimated loop, which kept a worklet running every frame, forever,
 *      per mounted screen - and a perpetually-invalidated layer can never be
 *      cached into a display list, so the gradients were re-considered on
 *      every frame instead of being rasterized once. The motion was ±26px
 *      over 14 seconds on a blurred bloom: invisible in practice, and by far
 *      the largest idle cost in the redesign.
 *
 * Gradient ids are namespaced per instance: react-native-svg resolves
 * `url(#id)` against a process-wide table on Android, so two backdrops
 * mounted at once during a screen transition would otherwise fight over the
 * same definition and one could paint with the other's colour.
 */
export const AmbientBackdrop = memo(({ grid = false, intensity = 1 }) => {
  const { palette, isDark } = usePalette();
  const { width, height } = useWindowDimensions();
  const uid = useId().replace(/:/g, "");

  const primaryId = `bloomPrimary-${uid}`;
  const accentId = `bloomAccent-${uid}`;
  const gridId = `grid-${uid}`;

  const bloomOpacity = (isDark ? 0.55 : 0.4) * intensity;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={primaryId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.primary} stopOpacity="1" />
            <Stop offset="55%" stopColor={palette.primary} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={accentId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.accentAlt} stopOpacity="1" />
            <Stop
              offset="55%"
              stopColor={palette.accentAlt}
              stopOpacity="0.35"
            />
            <Stop offset="100%" stopColor={palette.accentAlt} stopOpacity="0" />
          </RadialGradient>

          {grid ? (
            <Pattern
              id={gridId}
              width={GRID_STEP}
              height={GRID_STEP}
              patternUnits="userSpaceOnUse"
            >
              {/* One cell's top and left edge; tiling supplies the rest. */}
              <Path
                d={`M${GRID_STEP} 0 H0 V${GRID_STEP}`}
                stroke={palette.border}
                strokeWidth={0.5}
                fill="none"
              />
            </Pattern>
          ) : null}
        </Defs>

        {grid ? (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={`url(#${gridId})`}
            opacity={isDark ? 0.5 : 0.6}
          />
        ) : null}

        {/* Centres and radii match the old per-bloom <Svg> boxes: a bloom
            that was `size` wide at offset `cx` has its centre at cx + size/2. */}
        <Circle
          cx={width * 0.2}
          cy={width * 0.1}
          r={width * 0.55}
          fill={`url(#${primaryId})`}
          opacity={bloomOpacity}
        />
        <Circle
          cx={width * 0.95}
          cy={height * 0.42 + width * 0.5}
          r={width * 0.5}
          fill={`url(#${accentId})`}
          opacity={bloomOpacity * 0.85}
        />
      </Svg>
    </View>
  );
});

AmbientBackdrop.displayName = "AmbientBackdrop";

export default AmbientBackdrop;
