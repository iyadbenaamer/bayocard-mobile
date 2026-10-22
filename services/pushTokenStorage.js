import * as SecureStore from "expo-secure-store";

const PUSH_TOKEN_KEY = "expoPushToken";

export const getStoredPushToken = async () =>
  SecureStore.getItemAsync(PUSH_TOKEN_KEY);

export const setStoredPushToken = async (token) =>
  SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);

export const clearStoredPushToken = async () =>
  SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
