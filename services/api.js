import axios from "axios";

import { getAccessToken } from "./authStorage";
import {
  handleAccountInactive,
  handleSessionEvicted,
  handleSessionExpired,
} from "./sessionManager";

// Any of these mean the credential this device was using no longer
// authenticates it - either it was revoked (an admin revoked it, the user
// logged out elsewhere) or it simply expired. Treat all of them as "session
// expired" from the app's perspective. AUTH_SESSION_EVICTED is handled
// separately below since it gets its own, more specific message.
const SESSION_INVALID_CODES = [
  "AUTH_SESSION_EXPIRED",
  "AUTH_SESSION_REVOKED",
  "AUTH_SESSION_INVALID",
];

const API_URL = process.env.EXPO_PUBLIC_API_URL || "";
const baseURL = API_URL ? `${API_URL}` : "/api";

export const API_BASE_URL = baseURL;

const axiosClient = axios.create({ baseURL });

axiosClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    if (status === 403 && code === "AUTH_USER_INACTIVE") {
      await handleAccountInactive();
    } else if (code === "AUTH_SESSION_EVICTED") {
      await handleSessionEvicted();
    } else if (SESSION_INVALID_CODES.includes(code)) {
      await handleSessionExpired();
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
