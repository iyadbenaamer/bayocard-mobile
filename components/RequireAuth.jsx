import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSelector } from "react-redux";
import { getAccessToken } from "../services/authStorage";
import { selectUserProfile } from "../state/store";

/**
 * Wraps content that requires authentication.
 * Redirects to /login if no access token; otherwise renders children.
 */
export const RequireAuth = ({ children }) => {
  const router = useRouter();
  const profile = useSelector(selectUserProfile);
  const [status, setStatus] = useState("loading"); // 'loading' | 'auth' | 'unauth' | 'inactive'

  useEffect(() => {
    let isMounted = true;

    getAccessToken()
      .then((token) => {
        if (!isMounted) return;
        if (profile?.isActive === false) {
          setStatus("inactive");
          router.replace("/inactive");
          return;
        }
        if (token) {
          setStatus("auth");
        } else {
          setStatus("unauth");
          router.replace("/login");
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus("unauth");
          router.replace("/login");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router, profile]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (status === "unauth" || status === "inactive") {
    return null;
  }

  return children;
};

/**
 * Hook for screens that require authentication.
 * Returns 'loading' | 'auth' | 'unauth'. Redirects to /login when 'unauth'.
 */
export const useRequireAuth = () => {
  const router = useRouter();
  const profile = useSelector(selectUserProfile);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isMounted = true;

    getAccessToken()
      .then((token) => {
        if (!isMounted) return;
        if (profile?.isActive === false) {
          setStatus("inactive");
          router.replace("/inactive");
          return;
        }
        if (token) {
          setStatus("auth");
        } else {
          setStatus("unauth");
          router.replace("/login");
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus("unauth");
          router.replace("/login");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router, profile]);

  return status;
};
