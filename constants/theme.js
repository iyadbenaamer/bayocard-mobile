/**
 * MDCard design tokens - "Neon Arcade".
 *
 * The app sells game cards, so the visual language leans into an arcade/HUD
 * feel: deep space grounds, electric accents, glass panels with hairline
 * neon edges, and gradients that carry the brand blue into cyan/violet.
 *
 * Every key the app used before this redesign is still here (primary,
 * secondary, surface, border, icon, tint, tabIcon*, success/warning/danger)
 * so nothing that reads `Colors[theme].x` had to change all at once; the new
 * tokens sit alongside them.
 */

import { Platform } from "react-native";

/**
 * Blend an opacity into a solid hex color. Written as an 8-digit hex string
 * because RN's shadow/border props take colors, not separate alpha values,
 * and template-literal `${color}18` suffixes (used all over the old code)
 * silently break on shorthand hex.
 *
 * Results are cached: the palette is a fixed set of colours combined with a
 * fixed set of alphas, so the same handful of strings are asked for over and
 * over from inside render bodies. Returning the identical string each time
 * also keeps style props referentially stable, which is what lets memoized
 * list rows actually skip re-rendering.
 */
const alphaCache = new Map();

export const withAlpha = (hex, alpha) => {
  const key = `${hex}|${alpha}`;
  const cached = alphaCache.get(key);
  if (cached !== undefined) return cached;

  const clamped = Math.max(0, Math.min(1, alpha));
  const channel = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.slice(0, 7);
  const result = `${normalized}${channel}`;

  alphaCache.set(key, result);
  return result;
};

// Brand anchor - the original MDCard blue, kept as the darkest stop of the
// primary ramp so the redesign still reads as the same product.
const brandDeep = "#004c98";

const neon = {
  blue: "#2E7BFF",
  cyan: "#22D3EE",
  violet: "#A855F7",
  magenta: "#FF3D9A",
  lime: "#3DFFA8",
  amber: "#FFB020",
};

export const Colors = {
  light: {
    // — legacy keys —
    primary: "#0A4FE0",
    secondary: "#0B6BE3",
    success: "#0FA968",
    warning: "#D97706",
    danger: "#E11D48",
    text: "#0B1020",
    background: "#F4F6FD",
    surface: "#FFFFFF",
    border: "#E2E8F8",
    tint: "#0A4FE0",
    icon: "#5B6785",
    tabIconDefault: "#6B7796",
    tabIconSelected: "#0A4FE0",

    // — arcade tokens —
    brandDeep,
    accent: "#0B6BE3",
    accentAlt: "#6D31E0",
    highlight: "#F0338A",
    surfaceElevated: "#FFFFFF",
    surfaceSunken: "#EDF1FC",
    surfaceGlass: "rgba(255,255,255,0.72)",
    borderStrong: "#CBD6F0",
    borderGlow: withAlpha("#0A4FE0", 0.35),
    textMuted: "#5B6785",
    textFaint: "#8792AE",
    onAccent: "#FFFFFF",
    overlay: "rgba(11,16,32,0.45)",
    scrim: "rgba(244,246,253,0)",
    glowPrimary: withAlpha("#0A4FE0", 0.22),
    glowAccent: withAlpha("#0B6BE3", 0.2),
    glowViolet: withAlpha("#6D31E0", 0.16),
    shimmerBase: "#E6EBF8",
    shimmerHighlight: "#F7F9FF",
  },
  dark: {
    // — legacy keys —
    primary: neon.blue,
    secondary: neon.cyan,
    success: "#22E39A",
    warning: neon.amber,
    danger: "#FF4D6D",
    text: "#EAF0FF",
    background: "#070A14",
    surface: "#111730",
    border: "#232C4B",
    tint: neon.blue,
    icon: "#8A96B8",
    tabIconDefault: "#6C789B",
    tabIconSelected: neon.cyan,

    // — arcade tokens —
    brandDeep,
    accent: neon.cyan,
    accentAlt: neon.violet,
    highlight: neon.magenta,
    surfaceElevated: "#161E3C",
    surfaceSunken: "#0B1024",
    surfaceGlass: "rgba(22,30,60,0.72)",
    borderStrong: "#2E3A63",
    borderGlow: withAlpha(neon.cyan, 0.45),
    textMuted: "#8A96B8",
    textFaint: "#66739A",
    onAccent: "#04070F",
    overlay: "rgba(3,6,14,0.7)",
    scrim: "rgba(7,10,20,0)",
    glowPrimary: withAlpha(neon.blue, 0.45),
    glowAccent: withAlpha(neon.cyan, 0.4),
    glowViolet: withAlpha(neon.violet, 0.35),
    shimmerBase: "#1A2242",
    shimmerHighlight: "#26315C",
  },
};

/** Multi-stop gradients, keyed the same way as `Colors`. */
export const Gradients = {
  light: {
    // Every stop stays dark enough to carry white text (>= 4.5:1).
    brand: ["#0A4FE0", "#2D6BF0", "#5B44E8"],
    brandSoft: ["#E8F0FF", "#F3F7FF"],
    violet: ["#6D31E0", "#0A4FE0"],
    heat: ["#E1560A", "#C81742"],
    win: ["#0F9E62", "#0B8FB8"],
    surface: ["#FFFFFF", "#F3F6FF"],
    hero: ["#0A4FE0", "#2F62F0", "#6D31E0"],
    tabBar: ["rgba(255,255,255,0.96)", "rgba(240,244,255,0.96)"],
  },
  dark: {
    brand: [neon.blue, "#4F46E5", neon.violet],
    brandSoft: ["#151D3B", "#101733"],
    violet: [neon.violet, neon.blue],
    heat: ["#FB923C", "#FF3D9A"],
    win: ["#22E39A", neon.cyan],
    surface: ["#141C39", "#101630"],
    hero: ["#12224F", "#1B1442", "#0B1024"],
    tabBar: ["rgba(22,30,60,0.94)", "rgba(11,16,36,0.96)"],
  },
};

export const Radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screen: 20,
};

/**
 * Coloured drop shadow used as a neon "bloom". iOS renders the tint
 * directly; Android only honours `elevation` (shadowColor tinting landed in
 * API 28), so the value is tuned to look right in both places rather than
 * matching exactly.
 *
 * The numbers passed in are the dark-theme reference. Pass `isDark` and the
 * light-theme variant is derived (see the scales below); omitting it keeps
 * the dark values in both themes.
 *
 * Cached like withAlpha, and for the more important reason: this returns a
 * style *object*. Building a fresh one per render gave every card a new
 * shadow prop identity on every pass, so React Native re-diffed and re-sent
 * the shadow to the native side even when nothing had changed.
 */
// Light-mode softening, applied here rather than at each call site.
//
// Two separate things went wrong when a bloom tuned for the dark theme was
// dropped onto the light one. The tint is simply too strong against a pale
// ground: a shadow that reads as emitted light over #070A14 reads as grime
// over #F4F6FD. And on Android - which is what the POS terminals run - the
// tint is not even the operative property. Below API 28 shadowColor,
// shadowOpacity and shadowRadius are ignored outright and `elevation` alone
// drives a black ambient-plus-key shadow, so an elevation chosen to look
// right in the dark theme lands as a hard grey smudge in the light one.
// Elevation was never themed at all, which is why light mode looked heavier
// than dark despite carrying the lower opacity of the two.
//
// Call sites pass their dark-theme reference values and the light variant is
// derived from them, so this is one knob to turn instead of eighteen.
const LIGHT_OPACITY_SCALE = 0.25;
const LIGHT_ELEVATION_SCALE = 0.3;

const glowCache = new Map();

export const glow = (
  color,
  { opacity = 0.5, radius = 16, y = 8, elevation = 10, isDark = true } = {},
) => {
  const key = `${color}|${opacity}|${radius}|${y}|${elevation}|${isDark}`;
  const cached = glowCache.get(key);
  if (cached !== undefined) return cached;

  const result = {
    shadowColor: color,
    shadowOffset: { width: 0, height: y },
    shadowOpacity: isDark ? opacity : opacity * LIGHT_OPACITY_SCALE,
    shadowRadius: radius,
    // Keep a floor of 1: dropping to 0 removes the separation between a card
    // and the surface behind it entirely, which is a different bug.
    elevation: isDark
      ? elevation
      : Math.max(1, Math.round(elevation * LIGHT_ELEVATION_SCALE)),
  };

  glowCache.set(key, result);
  return result;
};

/** Neutral depth for panels that shouldn't glow. */
export const elevation = (level = 1) =>
  ({
    1: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 6,
      elevation: 3,
    },
    2: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 7,
    },
    3: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 14,
    },
  })[level];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
