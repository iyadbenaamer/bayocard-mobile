import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import * as AppIntegrity from "@expo/app-integrity";

const DEVICE_ID_KEY = "deviceId";
const APP_ATTEST_KEY_ID_KEY = "appAttestKeyId";

// Mirrors the server's SANDBOX_MODE/SANDBOX flag (server/utils/sandbox.js) -
// lets the full login flow be exercised against a sandboxed server without
// real Play Integrity/App Attest credentials configured on either side.

const generateId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

// ANDROID_ID / identifierForVendor are scoped to the device (+ vendor, on
// iOS) rather than to this app install, so - unlike anything this app writes
// itself via SecureStore/AsyncStorage - they survive an uninstall+reinstall.
// That's what lets the server recognize a reinstalled app as the same
// device instead of registering it as a brand new one (see
// Session.deviceId / createSession's dedup in server/utils/session.js).
// Neither is a perfect, unconditional identifier - ANDROID_ID changes on
// factory reset, and identifierForVendor resets if every app from this
// vendor is removed before reinstalling - but both are far more stable than
// a value this app generated and stored itself.
const getStableDeviceId = async () => {
  try {
    if (Platform.OS === "android") {
      return Application.androidId ?? null;
    }
    if (Platform.OS === "ios") {
      return await Application.getIosIdForVendorAsync();
    }
  } catch (err) {
    // Most likely cause: expo-application isn't linked into this build yet
    // (e.g. a dev-client binary built before the dependency was added) -
    // fall back below rather than crash login over device bookkeeping, but
    // log it since that fallback silently reproduces the reinstall-dedup
    // bug this id is meant to fix, and is easy to miss otherwise.
    console.warn(
      "[deviceAttestation] stable device id unavailable, falling back:",
      err,
    );
  }
  return null;
};

// A stable per-device identifier, purely for the server's "which device is
// this" bookkeeping (Session.deviceId) - not a security credential, so it
// doesn't need to be cryptographically derived. Falls back to a locally
// generated + persisted id where no OS-level identifier is available.
const getOrCreateDeviceId = async () => {
  const stableId = await getStableDeviceId();
  if (stableId) {
    return stableId;
  }

  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

const getDeviceName = () => Device.modelName || Device.deviceName || undefined;
const getAppVersion = () => Constants.expoConfig?.version;

const getAndroidAttestation = async (challenge) => {
  const cloudProjectNumber =
    process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER;
  if (!cloudProjectNumber) {
    throw new Error("GOOGLE_CLOUD_PROJECT_NUMBER_MISSING");
  }
  await AppIntegrity.prepareIntegrityTokenProviderAsync(cloudProjectNumber);
  // Play Integrity treats requestHash as opaque bytes it just echoes back in
  // the verdict - passing the server's challenge directly lets the server
  // compare the echoed value against what it issued, with no need for a
  // hashing step (or dependency) on-device. See services/deviceAuth.js on
  // the server for the matching half of this.
  const integrityToken =
    await AppIntegrity.requestIntegrityCheckAsync(challenge);
  return { integrityToken };
};

const getIosAttestation = async (challenge) => {
  let keyId = await SecureStore.getItemAsync(APP_ATTEST_KEY_ID_KEY);
  if (!keyId) {
    // First time this device install has ever authenticated - generate and
    // attest a new hardware-backed key. Every login after this reuses the
    // same key and only needs a (cheaper) assertion, not a fresh attestation.
    keyId = await AppIntegrity.generateKeyAsync();
    const attestation = await AppIntegrity.attestKeyAsync(keyId, challenge);
    return { keyId, attestation };
  }
  const assertion = await AppIntegrity.generateAssertionAsync(keyId, challenge);
  return { keyId, assertion };
};

// Builds the device-identity fields every login-equivalent request
// (login/verify-account/reset-password) must include, per
// AUTH_SESSIONS_PLAN.md. Throws if attestation can't be produced (e.g. no
// Play Integrity/App Attest configured, or the device fails the check) -
// callers should catch this and show the user a clear "this device
// couldn't be verified" message rather than a generic error.
export const buildDeviceAttestation = async (challenge) => {
  const deviceId = await getOrCreateDeviceId();
  const base = {
    deviceId,
    deviceName: getDeviceName(),
    appVersion: getAppVersion(),
  };

  if (Platform.OS === "ios") {
    return {
      ...base,
      platform: "ios",
      ...(await getIosAttestation(challenge)),
    };
  }
  if (Platform.OS === "android") {
    return {
      ...base,
      platform: "android",
      ...(await getAndroidAttestation(challenge)),
    };
  }
  throw new Error("DEVICE_ATTESTATION_UNSUPPORTED_PLATFORM");
};

export const persistAppAttestKeyId = async (keyId) =>
  SecureStore.setItemAsync(APP_ATTEST_KEY_ID_KEY, keyId);
