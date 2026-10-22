import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

import {
  getThemePreference,
  setThemePreference as persistThemePreference,
} from "../services/themeStorage";

const ThemePreferenceContext = createContext(undefined);

const ALLOWED_THEME_PREFERENCES = ["light", "dark", "system"];

const getResolvedColorScheme = (themePreference, systemColorScheme) => {
  if (themePreference === "system") {
    return systemColorScheme;
  }

  return themePreference;
};

export const ThemePreferenceProvider = ({ children }) => {
  const systemColorScheme = useSystemColorScheme() ?? "light";
  const [themePreference, setThemePreferenceState] = useState("dark");

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
  const systemColorScheme = useSystemColorScheme() ?? "light";

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
