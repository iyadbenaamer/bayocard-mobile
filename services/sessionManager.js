import { router } from "expo-router";

import { clearCart } from "../state/cartSlice";
import { clearFavorites } from "../state/favoritesSlice";
import { store } from "../state/store";
import { clearUser, setUserInactive } from "../state/userSlice";
import { clearAccessToken } from "./authStorage";

export const SESSION_NOTICE_SESSION_EXPIRED = "session-expired";
export const SESSION_NOTICE_SESSION_EVICTED = "session-evicted";
export const SESSION_NOTICE_ACCOUNT_INACTIVE = "account-inactive";

let pendingNotice = null;
let lastExpiryHandledAt = 0;
let lastInactiveHandledAt = 0;

const clearSessionAndRedirectToLogin = async (noticeType) => {
  pendingNotice = { type: noticeType };

  await clearAccessToken();
  store.dispatch(clearUser());
  store.dispatch(clearCart());
  store.dispatch(clearFavorites());
  router.replace("/login");
};

export const handleSessionExpired = async () => {
  const now = Date.now();
  if (now - lastExpiryHandledAt < 1000) {
    return;
  }
  lastExpiryHandledAt = now;
  await clearSessionAndRedirectToLogin(SESSION_NOTICE_SESSION_EXPIRED);
};

// This device's session was evicted to make room for a login on another
// device (the 2/5 concurrent-session cap in AUTH_SESSIONS_PLAN.md is
// LRU-enforced) - distinct from a plain expiry so the user isn't left
// wondering why they were signed out.
export const handleSessionEvicted = async () => {
  const now = Date.now();
  if (now - lastExpiryHandledAt < 1000) {
    return;
  }
  lastExpiryHandledAt = now;
  await clearSessionAndRedirectToLogin(SESSION_NOTICE_SESSION_EVICTED);
};

export const handleAccountInactive = async () => {
  const now = Date.now();
  if (now - lastInactiveHandledAt < 1000) {
    return;
  }

  lastInactiveHandledAt = now;
  pendingNotice = { type: SESSION_NOTICE_ACCOUNT_INACTIVE };
  store.dispatch(setUserInactive());
  router.replace("/inactive");
};

export const consumeSessionNotice = () => {
  const current = pendingNotice;
  pendingNotice = null;
  return current;
};
