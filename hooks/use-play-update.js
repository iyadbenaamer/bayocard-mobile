import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import {
  addInstallStatusListener,
  checkForPlayUpdate,
  completePlayUpdate,
  startPlayUpdate,
} from "../modules/in-app-updates/index.js";

// Tracks a Google Play flexible update (see modules/in-app-updates):
// starts the background download on demand and reports whether one is in
// flight or finished. A download that finished in an earlier session is
// picked up on launch and on every return to the foreground too, since Play
// keeps it waiting until the app installs it.
//
// status: idle | downloading | downloaded
export const usePlayUpdate = () => {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const applyInstallStatus = (installStatus) => {
      if (installStatus === "downloaded") {
        setStatus("downloaded");
      } else if (
        installStatus === "pending" ||
        installStatus === "downloading"
      ) {
        setStatus("downloading");
      } else if (installStatus === "failed" || installStatus === "canceled") {
        setStatus("idle");
      }
    };

    const syncWithPlay = async () => {
      const info = await checkForPlayUpdate();
      if (info) applyInstallStatus(info.installStatus);
    };

    syncWithPlay();
    const removeListener = addInstallStatusListener(applyInstallStatus);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") syncWithPlay();
    });

    return () => {
      removeListener();
      subscription.remove();
    };
  }, []);

  // Resolves to startPlayUpdate's result - "unavailable" means Play can't
  // serve this update, so the caller should fall back to the store page.
  const startFlexibleUpdate = useCallback(async () => {
    const result = await startPlayUpdate("flexible");
    if (result === "accepted") setStatus("downloading");
    return result;
  }, []);

  return { status, startFlexibleUpdate, completeUpdate: completePlayUpdate };
};
