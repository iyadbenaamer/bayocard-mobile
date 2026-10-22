import { useMemo } from "react";

import translations from "../i18n";
import { createTranslator } from "../i18n/translate";
import { useLocale } from "./use-locale";

export const useTranslation = () => {
  const { locale, isRTL, localePreference, setLocalePreference, isLoading } =
    useLocale();

  const t = useMemo(() => createTranslator(translations, locale), [locale]);

  return { t, locale, isRTL, localePreference, setLocalePreference, isLoading };
};
