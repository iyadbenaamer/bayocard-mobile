import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import {
  getThemePreference,
  setThemePreference as persistThemePreference,
} from "../services/themeStorage";

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
const ThemePreferenceContext = createContext(undefined);

const ALLOWED_THEME_PREFERENCES = ["light", "dark", "system"];

const useHydratedSystemColorScheme = () => {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme ?? "light";
  }

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return colorScheme ?? "light";
};

const getResolvedColorScheme = (themePreference, systemColorScheme) => {
  if (themePreference === "system") {
    return systemColorScheme;
  }

  return themePreference;
};

export const ThemePreferenceProvider = ({ children }) => {
  const systemColorScheme = useHydratedSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState("system");

  useEffect(() => {
    let isMounted = true;

    const loadThemePreference = async () => {
      const storedThemePreference = await getThemePreference();

      if (isMounted) {
        setThemePreferenceState(storedThemePreference);
      }
    };

    loadThemePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemePreference = useCallback(async (value) => {
    if (!ALLOWED_THEME_PREFERENCES.includes(value)) {
      return;
    }

    setThemePreferenceState(value);
    await persistThemePreference(value);
  }, []);

  const colorScheme = getResolvedColorScheme(
    themePreference,
    systemColorScheme,
  );

  const value = useMemo(
    () => ({ themePreference, setThemePreference, colorScheme }),
    [themePreference, setThemePreference, colorScheme],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
};

export const useThemePreference = () => {
  const context = useContext(ThemePreferenceContext);
  const systemColorScheme = useHydratedSystemColorScheme();

  if (context) {
    return context;
  }

  return {
    themePreference: "system",
    colorScheme: systemColorScheme,
    setThemePreference: async () => {},
  };
};

export const useColorScheme = () => useThemePreference().colorScheme;
