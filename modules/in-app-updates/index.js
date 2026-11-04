import { requireOptionalNativeModule } from "expo-modules-core";

// Android-only, and null wherever it isn't linked (iOS, Expo Go, or a build
// from before this module was added) - every export below then reports
// "unavailable", and callers fall back to opening the store page, the
// pre-existing update path.
const InAppUpdates = requireOptionalNativeModule("InAppUpdates");

export function isInAppUpdatesAvailable() {
  return InAppUpdates !== null;
}

// Resolves to Play's view of this install - { updateAvailability:
// "available" | "not-available" | "in-progress" | "unknown", installStatus:
// "downloading" | "downloaded" | ..., immediateAllowed, flexibleAllowed,
// availableVersionCode } - or null when Play can't answer (module missing,
// or the app wasn't installed from Google Play, e.g. a sideloaded APK on a
// POS terminal without the Play Store).
export async function checkForPlayUpdate() {
  if (!InAppUpdates) return null;
  try {
    return await InAppUpdates.checkForUpdate();
  } catch {
    return null;
  }
}

// type: "immediate" (Play's full-screen flow; the app restarts when done)
// or "flexible" (downloads in the background while the app stays usable -
// call completePlayUpdate once it reports "downloaded"). Resolves to
// "accepted" | "canceled" | "failed" | "unavailable", where "unavailable"
// means Play has no update to offer this install right now.
export async function startPlayUpdate(type) {
  if (!InAppUpdates) return "unavailable";
  try {
    return type === "immediate"
      ? await InAppUpdates.startImmediateUpdate()
      : await InAppUpdates.startFlexibleUpdate();
  } catch {
    return "unavailable";
  }
}

// Installs a downloaded flexible update; Play restarts the app.
export async function completePlayUpdate() {
  if (!InAppUpdates) return;
  try {
    await InAppUpdates.completeUpdate();
  } catch (err) {
    console.error("Failed to complete Play update:", err);
  }
}

// listener receives a flexible update's install status (same strings as
// checkForPlayUpdate's installStatus). Returns an unsubscribe function.
export function addInstallStatusListener(listener) {
  if (!InAppUpdates) return () => {};
  const subscription = InAppUpdates.addListener(
    "onInstallStatusChange",
    ({ status }) => listener(status),
  );
  return () => subscription.remove();
}
