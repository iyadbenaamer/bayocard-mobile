import { useMemo } from "react";

import { Colors, Gradients } from "../constants/theme";
import { useColorScheme } from "./use-color-scheme";

/**
 * One call for everything a screen needs to paint itself: the resolved
 * palette, the matching gradient set, and the scheme name for the handful of
 * places that genuinely branch on light/dark (logo swaps, status bar).
 *
 * Screens used to repeat `useColorScheme()` + `Colors[theme]` and then reach
 * for `Gradients[theme]` separately; folding it into one memoized object
 * keeps the gradient arrays referentially stable, which matters because they
 * are passed straight into <LinearGradient colors={...}> inside memoized
 * list rows.
 */
export const usePalette = () => {
  const scheme = useColorScheme() ?? "light";

  return useMemo(
    () => ({
      scheme,
      isDark: scheme === "dark",
      palette: Colors[scheme],
      gradients: Gradients[scheme],
    }),
    [scheme],
  );
};

export default usePalette;
