import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "accessToken";

export const setAccessToken = async (token) =>
  SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);

export const getAccessToken = async () =>
  SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

export const clearAccessToken = async () =>
  SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
