import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useDispatch } from "react-redux";

import { verifyAccessToken } from "../services/authApi";
import { clearAccessToken, getAccessToken } from "../services/authStorage";
import { getUserById } from "../services/userApi";
import { handleAccountInactive } from "../services/sessionManager";
import { clearCart } from "../state/cartSlice";
import { clearUser, setUser } from "../state/userSlice";

const IndexScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isMounted) {
            router.replace("/login");
          }
          return;
        }
        const session = await verifyAccessToken();
        if (session?.id) {
          const user = await getUserById(session.id);
          if (user) {
            dispatch(setUser(user));
          }
        }
        if (isMounted) {
          router.replace("/(tabs)");
        }
      } catch (error) {
        const code = error?.response?.data?.code;
        if (code === "AUTH_USER_INACTIVE") {
          await handleAccountInactive();
          return;
        }
        await clearAccessToken();
        dispatch(clearUser());
        dispatch(clearCart());
        if (isMounted) {
          router.replace("/login");
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [dispatch, router]);

  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" />
    </View>
  );
};

export default IndexScreen;
