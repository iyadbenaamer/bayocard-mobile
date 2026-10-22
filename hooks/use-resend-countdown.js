import { useCallback, useEffect, useRef, useState } from "react";

const computeSecondsLeft = (resendAfter) => {
  if (!resendAfter) {
    return 0;
  }
  const target = new Date(resendAfter).getTime();
  if (Number.isNaN(target)) {
    return 0;
  }
  return Math.max(0, Math.ceil((target - Date.now()) / 1000));
};

// Formats a countdown for display: "M:SS" under an hour, "Hس Mد" beyond that
// (used for the once-a-day lockout window, which can be up to 24h away).
export const formatCountdown = (totalSeconds) => {
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return minutes > 0 ? `${hours} س ${minutes} د` : `${hours} س`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

// Drives a resend-code countdown from a server-provided `resendAfter`
// timestamp, so the button reflects the real cooldown even if the app was
// backgrounded or the previous send happened on a different screen.
export const useResendCountdown = (initialResendAfter = null) => {
  const [resendAfter, setResendAfter] = useState(initialResendAfter);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    computeSecondsLeft(initialResendAfter),
  );
  const intervalRef = useRef(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSecondsLeft(computeSecondsLeft(resendAfter));
    if (!resendAfter) {
      return undefined;
    }
    intervalRef.current = setInterval(() => {
      const remaining = computeSecondsLeft(resendAfter);
      setSecondsLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [resendAfter]);

  const startCountdown = useCallback((nextResendAfter) => {
    setResendAfter(nextResendAfter || null);
  }, []);

  return { secondsLeft, isCounting: secondsLeft > 0, startCountdown };
};
