import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Platform, Text, View } from "react-native";
import { useDispatch } from "react-redux";

import ScreenTitle from "../components/Title";
import AmbientBackdrop from "../components/arcade/AmbientBackdrop";
import GlowCard from "../components/arcade/GlowCard";
import IconBubble from "../components/arcade/IconBubble";
import NeonButton from "../components/arcade/NeonButton";
import { FontFamily } from "../constants/fonts";
import { Radii } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { clearAccessToken } from "../services/authStorage";
import { clearCart } from "../state/cartSlice";
import { clearUser } from "../state/userSlice";

import LogoutIcon from "../assets/icons/logout.svg";

const InactiveAccountScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { palette } = usePalette();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await clearAccessToken();
    dispatch(clearUser());
    dispatch(clearCart());
    router.replace("/login");
  };

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (Platform.OS === "android") {
          router.replace("/login");
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [router]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop grid />
      <View className="flex-1 px-6 mt-10">
        <ScreenTitle>{t("inactive.greeting")}</ScreenTitle>
        <GlowCard
          radius={Radii.xl}
          tone={palette.warning}
          intensity="strong"
          fill={palette.surfaceElevated}
          contentStyle={{
            padding: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
          style={{ marginTop: 16 }}
        >
          <IconBubble size={44} tone={palette.warning}>
            <LogoutIcon
              style={{ width: 20, height: 20, stroke: palette.warning }}
            />
          </IconBubble>
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              lineHeight: 22,
              color: palette.text,
              fontFamily: FontFamily.medium,
            }}
          >
            {t("inactive.pendingReviewMessage")}
          </Text>
        </GlowCard>
        <NeonButton
          label={t("inactive.logoutButton")}
          variant="outline"
          tone={palette.danger}
          size="lg"
          onPress={handleLogout}
          icon={
            <LogoutIcon
              style={{ width: 20, height: 20, stroke: palette.danger }}
            />
          }
          style={{ marginTop: 24 }}
          full
        />
      </View>
    </View>
  );
};

export default InactiveAccountScreen;
