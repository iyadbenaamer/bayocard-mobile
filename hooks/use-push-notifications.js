import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import { useDispatch } from "react-redux";

import {
  registerAnonymousDeviceToken,
  removeAnonymousDeviceToken,
} from "../services/deviceTokenApi";
import {
  registerPushToken,
  unregisterPushToken,
} from "../services/pushNotificationApi";
import {
  clearStoredPushToken,
  getStoredPushToken,
  setStoredPushToken,
} from "../services/pushTokenStorage";
import { addNotification } from "../state/notificationsSlice";
import generateUuid from "../utils/generateUuid";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const projectId = Constants.expoConfig?.extra?.eas?.projectId;

// Module-scoped so concurrent callers (the permission gate below and the
// login-triggered registration effect) share one in-flight check instead of
// each independently prompting/alerting.
let inFlightPermissionCheck = null;

// Some devices (Android POS terminals in particular) never show their own
// notification prompt and/or let the merchant silently dismiss it once, so
// permission is re-checked every time the app opens or comes back to the
// foreground rather than only the first time. Once the OS itself refuses to
// show the dialog again (already denied), the only way to actually force it
// on is to send the user to the system settings screen.
const ensureNotificationPermission = () => {
  if (inFlightPermissionCheck) {
    return inFlightPermissionCheck;
  }

  inFlightPermissionCheck = (async () => {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        return "granted";
      }

      if (canAskAgain) {
        const { status: requestedStatus } =
          await Notifications.requestPermissionsAsync();
        if (requestedStatus === "granted") {
          return "granted";
        }
      }

      Alert.alert(
        "إشعارات التطبيق غير مفعلة",
        "لن تصلك تنبيهات الطلبات والمعاملات إلا بعد تفعيل إذن الإشعارات من إعدادات الجهاز.",
        [
          { text: "لاحقًا", style: "cancel" },
          { text: "فتح الإعدادات", onPress: () => Linking.openSettings() },
        ],
      );
      return "denied";
    } finally {
      inFlightPermissionCheck = null;
    }
  })();

  return inFlightPermissionCheck;
};

const getExpoPushToken = async () => {
  const permission = await ensureNotificationPermission();
  if (permission !== "granted") {
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
};

// Re-runs the permission check on mount and every time the app returns to
// the foreground, independent of login state, so the prompt (or the
// settings redirect) reappears on every app open rather than only once.
const useNotificationPermissionGate = () => {
  useEffect(() => {
    ensureNotificationPermission();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        ensureNotificationPermission();
      }
    });

    return () => subscription.remove();
  }, []);
};

// Registers the device for push notifications whenever a logged-in, active
// user profile is available, and keeps the backend's copy of the Expo push
// token in sync with what this device last registered. Re-arms itself when
// the profile clears (logout) so the next login registers again.
//
// When there's no logged-in user (not yet signed up, or logged out), the
// same token is registered anonymously instead (see services/deviceTokenApi)
// so the panel can still reach this device as an "unauthorized users"
// notification target. The anonymous entry is removed the moment the device
// does log in, so it isn't double-counted as both authorized and
// unauthorized.
export const usePushNotifications = (profile) => {
  useNotificationPermissionGate();
  const dispatch = useDispatch();

  const hasRegisteredAuthRef = useRef(false);
  const hasRegisteredAnonRef = useRef(false);
  const isLoggedInActive = Boolean(profile) && profile?.isActive !== false;

  // Stores every received push locally (app data, not the server) so the
  // in-app notifications list works independently of any server-side feed.
  // Always appends - a repeat of the same title/body still stacks as its
  // own entry rather than being deduplicated.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (event) => {
        const content = event?.request?.content;
        if (!content) return;
        dispatch(
          addNotification({
            id: generateUuid(),
            title: content.title || "Bayo Card",
            body: content.body || "",
            data: content.data || null,
            receivedAt: new Date().toISOString(),
          }),
        );
      },
    );

    return () => subscription.remove();
  }, [dispatch]);

  useEffect(() => {
    if (isLoggedInActive) {
      hasRegisteredAnonRef.current = false;
      if (hasRegisteredAuthRef.current) {
        return;
      }
      hasRegisteredAuthRef.current = true;

      (async () => {
        try {
          const token = await getExpoPushToken();
          if (!token) return;

          const previousToken = await getStoredPushToken();
          if (previousToken && previousToken !== token) {
            await unregisterPushToken(previousToken).catch(() => {});
          }

          await registerPushToken(token);
          await setStoredPushToken(token);
          await removeAnonymousDeviceToken(token).catch(() => {});
        } catch (err) {
          console.warn("Failed to register push token:", err);
        }
      })();
    } else {
      hasRegisteredAuthRef.current = false;
      if (hasRegisteredAnonRef.current) {
        return;
      }
      hasRegisteredAnonRef.current = true;

      (async () => {
        try {
          const token = await getExpoPushToken();
          if (!token) return;

          await registerAnonymousDeviceToken(token, Platform.OS);
        } catch (err) {
          console.warn("Failed to register anonymous device token:", err);
        }
      })();
    }
  }, [isLoggedInActive]);
};

// Best-effort unregistration of this device's push token; call before
// clearing the auth token on logout so the request is still authenticated.
export const unregisterCurrentPushToken = async () => {
  try {
    const token = await getStoredPushToken();
    if (token) {
      await unregisterPushToken(token).catch(() => {});
    }
  } finally {
    await clearStoredPushToken();
  }
};
