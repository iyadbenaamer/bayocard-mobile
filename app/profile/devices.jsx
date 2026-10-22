import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import AutoHideTabBarScrollView from "../../components/AutoHideTabBarScrollView";
import ScreenTitle from "../../components/Title";
import PopupMessage from "../../components/ui/PopupMessage";
import { useRequireAuth } from "../../components/RequireAuth";
import { FontFamily } from "../../constants/fonts";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useTranslation } from "../../hooks/use-translation";
import { getSessions, revokeSession } from "../../services/sessionsApi";
import formatDate from "../../utils/formatDate";

const platformIcon = (platform) =>
  platform === "ios" ? "apple" : "android";

const DevicesScreen = () => {
  const authStatus = useRequireAuth();
  const theme = useColorScheme() ?? "light";
  const palette = Colors[theme];
  const { t } = useTranslation();
  const platformLabel = (platform) =>
    platform === "ios" ? t("devices.iosLabel") : t("devices.androidLabel");
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [revokingId, setRevokingId] = useState(null);
  const [popup, setPopup] = useState({ visible: false, message: "", type: "info" });

  const showPopup = (message, type = "info") =>
    setPopup({ visible: true, message, type });
  const closePopup = () => setPopup((prev) => ({ ...prev, visible: false }));

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setErrorMessage(t("devices.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authStatus === "auth") {
        fetchSessions();
      }
    }, [authStatus, fetchSessions]),
  );

  const handleRevoke = async (session) => {
    setRevokingId(session.id);
    try {
      await revokeSession(session.id);
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      showPopup(t("devices.revokeSuccess"), "success");
    } catch {
      showPopup(t("devices.revokeError"), "error");
    } finally {
      setRevokingId(null);
    }
  };

  if (authStatus === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (authStatus === "unauth" || authStatus === "inactive") {
    return null;
  }

  return (
    <AutoHideTabBarScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
    >
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      <ScreenTitle back>{t("devices.title")}</ScreenTitle>
      <Text
        className="mt-2 text-sm"
        style={{ color: palette.icon, fontFamily: FontFamily.regular }}
      >
        {t("devices.description")}
      </Text>

      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : errorMessage ? (
        <Text
          className="mt-6 text-center text-sm"
          style={{ color: palette.danger, fontFamily: FontFamily.regular }}
        >
          {errorMessage}
        </Text>
      ) : sessions.length === 0 ? (
        <Text
          className="mt-6 text-center text-sm"
          style={{ color: palette.icon, fontFamily: FontFamily.regular }}
        >
          {t("devices.noDevices")}
        </Text>
      ) : (
        <View className="mt-4 gap-3">
          {sessions.map((session) => (
            <View
              key={session.id}
              className="rounded-2xl border px-4 py-3"
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            >
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons
                  name={platformIcon(session.platform)}
                  size={22}
                  color={palette.primary}
                />
                <View className="flex-1">
                  <Text style={{ color: palette.text, fontFamily: FontFamily.bold }}>
                    {session.deviceName || platformLabel(session.platform)}
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: palette.icon, fontFamily: FontFamily.regular }}
                  >
                    {t("devices.lastActivityLabel")}{" "}
                    {session.lastUsedAt ? formatDate(session.lastUsedAt) : "—"}
                  </Text>
                </View>
                {session.isCurrent ? (
                  <View
                    className="px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${palette.primary}20` }}
                  >
                    <Text
                      className="text-xs"
                      style={{ color: palette.primary, fontFamily: FontFamily.medium }}
                    >
                      {t("devices.currentDeviceLabel")}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleRevoke(session)}
                    disabled={revokingId === session.id}
                  >
                    {revokingId === session.id ? (
                      <ActivityIndicator size="small" color={palette.danger} />
                    ) : (
                      <Text
                        className="text-xs"
                        style={{ color: palette.danger, fontFamily: FontFamily.medium }}
                      >
                        {t("devices.logoutButton")}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </AutoHideTabBarScrollView>
  );
};

export default DevicesScreen;
