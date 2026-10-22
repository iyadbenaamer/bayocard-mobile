import * as SecureStore from "expo-secure-store";

const LOCALE_PREFERENCE_KEY = "localePreference";

const ALLOWED_LOCALE_PREFERENCES = ["ar", "en", "system"];

const isValidLocalePreference = (value) =>
  ALLOWED_LOCALE_PREFERENCES.includes(value);

export const getLocalePreference = async () => {
  const value = await SecureStore.getItemAsync(LOCALE_PREFERENCE_KEY);

  if (!isValidLocalePreference(value)) {
    return "system";
  }

  return value;
};

export const setLocalePreference = async (localePreference) => {
  if (!isValidLocalePreference(localePreference)) {
    return;
  }

  await SecureStore.setItemAsync(LOCALE_PREFERENCE_KEY, localePreference);
};
