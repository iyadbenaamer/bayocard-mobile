import { useCallback, useEffect, useState } from "react";

import { checkAndFetchUpdate, isOtaEnabled, reloadApp } from "../services/appUpdates";

// idle | checking | up-to-date | downloaded | error | disabled
export const useAppUpdates = ({ autoCheck = false } = {}) => {
  const [status, setStatus] = useState("idle");

  const checkForUpdate = useCallback(async () => {
    if (!isOtaEnabled()) {
      setStatus("disabled");
      return "disabled";
    }
    setStatus("checking");
    const result = await checkAndFetchUpdate();
    setStatus(result.status);
    return result.status;
  }, []);

  useEffect(() => {
    if (autoCheck) checkForUpdate();
  }, [autoCheck, checkForUpdate]);

  return { status, checkForUpdate, reloadApp };
};
