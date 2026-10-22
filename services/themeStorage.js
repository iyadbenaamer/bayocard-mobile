import * as SecureStore from "expo-secure-store";

const THEME_PREFERENCE_KEY = "themePreference";

const ALLOWED_THEME_PREFERENCES = ["light", "dark", "system"];

const isValidThemePreference = (value) =>
  ALLOWED_THEME_PREFERENCES.includes(value);

export const getThemePreference = async () => {
  const value = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);

  if (!isValidThemePreference(value)) {
    return "dark";
  }

  return value;
};

export const setThemePreference = async (themePreference) => {
  if (!isValidThemePreference(themePreference)) {
    return;
  }

  await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, themePreference);
};
