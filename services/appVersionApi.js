import Constants from "expo-constants";
import { Platform } from "react-native";

import axiosClient from "./api";
import { compareVersions } from "../utils/compareVersions";

export const getAppVersion = async () => {
  const res = await axiosClient.get("/app-version");
  return res.data;
};

// Fetches the admin-configured min/latest version for this platform and
// compares it against the running app's native version. Below minVersion
// means the user must update to keep using the app (see
// components/ForceUpdateScreen); below latestVersion (but not blocked)
// just surfaces a dismissible nudge (see components/UpdateBanner).
export const checkAppVersionStatus = async () => {
  const currentVersion = Constants.expoConfig?.version || "0.0.0";
  const data = await getAppVersion();
  const platformInfo = Platform.OS === "ios" ? data?.ios : data?.android;

  if (!platformInfo) {
    return { blocked: false, updateAvailable: false, currentVersion, storeUrl: null };
  }

  const { minVersion, latestVersion, storeUrl } = platformInfo;
  const blocked = minVersion ? compareVersions(currentVersion, minVersion) < 0 : false;
  const updateAvailable =
    !blocked && latestVersion ? compareVersions(currentVersion, latestVersion) < 0 : false;

  return { blocked, updateAvailable, currentVersion, latestVersion, storeUrl: storeUrl || null };
};
