import * as Updates from "expo-updates";

// Updates.isEnabled is false in Expo Go / dev client and in any build that
// wasn't published through EAS Update - calling the check/fetch APIs there
// throws, so every caller must gate on this first.
export const isOtaEnabled = () => !__DEV__ && Updates.isEnabled;

// Checks for an OTA (JS/asset-only) update and downloads it if one exists.
// Does not apply it - the new bundle only takes effect after reloadApp() or
// the next cold start, so callers decide when to prompt the user.
export const checkAndFetchUpdate = async () => {
  if (!isOtaEnabled()) return { status: "disabled" };
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return { status: "up-to-date" };
    await Updates.fetchUpdateAsync();
    return { status: "downloaded" };
  } catch (err) {
    console.error("Failed to check/fetch OTA update:", err);
    return { status: "error", error: err };
  }
};

export const reloadApp = () => Updates.reloadAsync();
