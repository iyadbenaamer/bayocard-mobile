import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { I18nManager } from "react-native";
import * as Localization from "expo-localization";

import {
  getLocalePreference,
  setLocalePreference as persistLocalePreference,
} from "../services/localeStorage";

const LocaleContext = createContext(undefined);

const ALLOWED_LOCALE_PREFERENCES = ["ar", "en", "system"];

// The app only ships Arabic and English copy, so any device language other
// than Arabic (French, Spanish, ...) falls back to English rather than
// Arabic - Arabic is reserved for devices actually set to Arabic.
const getSystemLocale = () => {
  const languageCode = Localization.getLocales()?.[0]?.languageCode;
  return languageCode === "ar" ? "ar" : "en";
};

const resolveLocale = (localePreference) =>
  localePreference === "system" ? getSystemLocale() : localePreference;

export const LocaleProvider = ({ children }) => {
  // Starts as "system" purely as a placeholder while the real stored
  // preference loads from SecureStore below - isLoading gates every
  // consumer (see app/_layout.jsx) so nothing renders, and critically the
  // forceRTL effect below never fires, using this placeholder value. Without
  // that gate, a user who explicitly chose Arabic on a device whose OS
  // language is English would have every single launch briefly resolve to
  // the English/LTR default and force the native flag back to LTR before
  // the real "ar" preference loaded a moment later - fighting their choice.
  const [localePreference, setLocalePreferenceState] = useState("system");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadLocalePreference = async () => {
      const storedLocalePreference = await getLocalePreference();

      if (isMounted) {
        setLocalePreferenceState(storedLocalePreference);
        setIsLoading(false);
      }
    };

    loadLocalePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const locale = resolveLocale(localePreference);
  const isRTL = locale === "ar";

  // Keep the native layout direction in sync with the resolved locale once
  // the real stored preference is known, so it is correctly persisted for
  // the next real app restart (see setLocalePreference below for why an
  // in-session flip can't be applied automatically).
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(isRTL);
    }
  }, [isLoading, isRTL]);

  // Returns { directionChanged } so the caller can prompt for a restart -
  // I18nManager.forceRTL only takes visual effect after the native app
  // process is actually killed and relaunched. A JS-only reload
  // (Updates.reloadAsync, Fast Refresh, ...) re-executes the bundle but
  // does not recreate the native Activity/window, so it is not reliable
  // enough to trigger automatically here; the UI asks the user to restart
  // instead, the same way the OTA-update banner does elsewhere in the app.
  const setLocalePreference = useCallback(async (value) => {
    if (!ALLOWED_LOCALE_PREFERENCES.includes(value)) {
      return { directionChanged: false };
    }

    const nextIsRTL = resolveLocale(value) === "ar";
    const directionChanged = nextIsRTL !== I18nManager.isRTL;

    setLocalePreferenceState(value);
    await persistLocalePreference(value);

    if (directionChanged) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(nextIsRTL);
    }

    return { directionChanged };
  }, []);

  const value = useMemo(
    () => ({ localePreference, setLocalePreference, locale, isRTL, isLoading }),
    [localePreference, setLocalePreference, locale, isRTL, isLoading],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);

  if (context) {
    return context;
  }

  const locale = getSystemLocale();
  return {
    localePreference: "system",
    locale,
    isRTL: locale === "ar",
    isLoading: false,
    setLocalePreference: async () => ({ directionChanged: false }),
  };
};
