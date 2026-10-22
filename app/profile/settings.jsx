import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, Switch, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import AutoHideTabBarScrollView from "../../components/AutoHideTabBarScrollView";
import ScreenTitle from "../../components/Title";
import { useRequireAuth } from "../../components/RequireAuth";
import { FontFamily } from "../../constants/fonts";
import { Colors } from "../../constants/theme";
import { useAppUpdates } from "../../hooks/use-app-updates";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useTranslation } from "../../hooks/use-translation";
import { selectPrintQrCode, setPrintQrCode } from "../../state/printerSlice";

const SettingsScreen = () => {
  const authStatus = useRequireAuth();
  const router = useRouter();
  const dispatch = useDispatch();
  const theme = useColorScheme() ?? "light";
  const palette = Colors[theme];
  const { t, isRTL } = useTranslation();
  const user = useSelector((state) => state.user);
  const isBusiness = user?.profile?.role === "business";
  const printQrCode = useSelector(selectPrintQrCode);
  const { status: otaStatus, checkForUpdate, reloadApp } = useAppUpdates();
  const chevronIcon = isRTL ? "chevron-left" : "chevron-right";

  const UPDATE_STATUS_MESSAGES = {
    "up-to-date": t("settings.updateStatusUpToDate"),
    downloaded: t("settings.updateStatusDownloaded"),
    disabled: t("settings.updateStatusDisabled"),
    error: t("settings.updateStatusError"),
  };

  const handleCheckForUpdates = async () => {
    const result = await checkForUpdate();
    if (result === "downloaded") {
      Alert.alert(t("settings.newUpdateAlertTitle"), UPDATE_STATUS_MESSAGES.downloaded, [
        { text: t("settings.later"), style: "cancel" },
        { text: t("settings.restartNow"), onPress: reloadApp },
      ]);
      return;
    }
    Alert.alert(t("settings.checkUpdatesAlertTitle"), UPDATE_STATUS_MESSAGES[result] || "");
  };

  // Printing (and therefore every setting on this screen) is a
  // business-only feature - keep individual accounts from reaching it via
  // a direct link even though the nav entry to it is hidden for them.
  useEffect(() => {
    if (authStatus === "auth" && !isBusiness) {
      router.replace("/profile");
    }
  }, [authStatus, isBusiness, router]);

  if (authStatus === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (authStatus === "unauth" || authStatus === "inactive" || !isBusiness) {
    return null;
  }

  return (
    <AutoHideTabBarScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
    >
      <ScreenTitle back>{t("settings.title")}</ScreenTitle>

      <TouchableOpacity
        className="mt-3 rounded-2xl px-3 py-2.5 flex-row items-center gap-2"
        style={{ backgroundColor: palette.surfaceElevated, borderColor: palette.borderStrong, borderWidth: 1 }}
        onPress={() => router.push("/profile/printer-settings")}
      >
        <MaterialCommunityIcons name="printer" size={20} color={palette.primary} />
        <Text
          className="text-sm flex-1"
          style={{ fontFamily: FontFamily.medium, color: palette.text }}
        >
          {t("settings.printerRow")}
        </Text>
        <MaterialCommunityIcons name={chevronIcon} size={18} color={palette.icon} />
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-2 rounded-2xl px-3 py-2.5 flex-row items-center gap-2"
        style={{ backgroundColor: palette.surfaceElevated, borderColor: palette.borderStrong, borderWidth: 1 }}
        onPress={() => router.push("/profile/api-keys")}
      >
        <MaterialCommunityIcons name="key-outline" size={20} color={palette.primary} />
        <Text
          className="text-sm flex-1"
          style={{ fontFamily: FontFamily.medium, color: palette.text }}
        >
          {t("settings.apiKeysRow")}
        </Text>
        <MaterialCommunityIcons name={chevronIcon} size={18} color={palette.icon} />
      </TouchableOpacity>

      <View
        className="mt-2 rounded-2xl px-3 py-2.5 flex-row items-center gap-2"
        style={{ backgroundColor: palette.surfaceElevated, borderColor: palette.borderStrong, borderWidth: 1 }}
      >
        <MaterialCommunityIcons name="qrcode" size={20} color={palette.primary} />
        <Text
          className="text-sm flex-1"
          style={{ fontFamily: FontFamily.medium, color: palette.text }}
        >
          {t("settings.printQrRow")}
        </Text>
        <Switch
          value={printQrCode}
          onValueChange={(value) => dispatch(setPrintQrCode(value))}
          trackColor={{ false: palette.border, true: palette.primary }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        className="mt-2 rounded-2xl px-3 py-2.5 flex-row items-center gap-2"
        style={{ backgroundColor: palette.surfaceElevated, borderColor: palette.borderStrong, borderWidth: 1 }}
        onPress={handleCheckForUpdates}
        disabled={otaStatus === "checking"}
      >
        <MaterialCommunityIcons name="update" size={20} color={palette.primary} />
        <Text
          className="text-sm flex-1"
          style={{ fontFamily: FontFamily.medium, color: palette.text }}
        >
          {t("settings.checkUpdatesRow")}
        </Text>
        {otaStatus === "checking" ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : (
          <MaterialCommunityIcons name={chevronIcon} size={18} color={palette.icon} />
        )}
      </TouchableOpacity>

      <Text
        className="text-xs text-center mt-4"
        style={{ fontFamily: FontFamily.regular, color: palette.icon }}
      >
        {t("settings.versionFooter", { version: Constants.expoConfig?.version })}
      </Text>
    </AutoHideTabBarScrollView>
  );
};

export default SettingsScreen;
