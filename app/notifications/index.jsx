import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, Linking, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { useRequireAuth } from "../../components/RequireAuth";
import ScreenTitle from "../../components/Title";
import AmbientBackdrop from "../../components/arcade/AmbientBackdrop";
import GlowCard from "../../components/arcade/GlowCard";
import IconBubble from "../../components/arcade/IconBubble";
import PressableScale from "../../components/arcade/Pressable";
import { FontFamily } from "../../constants/fonts";
import { Radii, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import { clearNotifications } from "../../state/notificationsSlice";
import formatDate from "../../utils/formatDate";

const NotificationItem = ({ item, palette, onPress }) => {
  const imageUri = item.data?.image || null;
  const isLinked = Boolean(item.data?.link);

  return (
    <PressableScale
      onPress={() => onPress(item)}
      disabled={!isLinked}
      scaleTo={isLinked ? 0.98 : 1}
      style={{ marginBottom: 12 }}
    >
      <GlowCard
        radius={Radii.lg}
        intensity="soft"
        contentStyle={{ flexDirection: "row", gap: 12, padding: 12 }}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: 56, height: 56, borderRadius: Radii.sm }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <IconBubble size={48} variant="gradient">
            <Ionicons name="notifications" size={20} color="#FFFFFF" />
          </IconBubble>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: palette.text,
              fontFamily: FontFamily.bold,
              fontSize: 15,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            style={{
              color: palette.textMuted,
              fontFamily: FontFamily.regular,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 4,
            }}
            numberOfLines={3}
          >
            {item.body}
          </Text>
          <Text
            style={{
              color: palette.textFaint,
              fontFamily: FontFamily.regular,
              fontSize: 11,
              marginTop: 6,
            }}
          >
            {formatDate(item.receivedAt)}
          </Text>
        </View>
      </GlowCard>
    </PressableScale>
  );
};

const Notifications = () => {
  useRequireAuth();
  const router = useRouter();
  const dispatch = useDispatch();
  const { palette } = usePalette();
  const { t } = useTranslation();

  const notifications = useSelector((state) => state.notifications.items);

  const handlePress = useCallback(
    (item) => {
      const link = item?.data?.link;
      if (!link) return;
      if (link.startsWith("/")) {
        router.push(link);
      } else {
        Linking.openURL(link).catch(() => {});
      }
    },
    [router],
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} palette={palette} onPress={handlePress} />
          )}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <ScreenTitle back>{t("notifications.title")}</ScreenTitle>
                </View>
                {notifications.length > 0 ? (
                  <PressableScale
                    onPress={() => dispatch(clearNotifications())}
                    scaleTo={0.92}
                    hitSlop={8}
                    accessibilityRole="button"
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: Radii.pill,
                      backgroundColor: withAlpha(palette.danger, 0.12),
                      borderWidth: 1,
                      borderColor: withAlpha(palette.danger, 0.3),
                    }}
                  >
                    <Text
                      style={{
                        color: palette.danger,
                        fontFamily: FontFamily.medium,
                        fontSize: 12,
                      }}
                    >
                      {t("notifications.clearAll")}
                    </Text>
                  </PressableScale>
                ) : null}
              </View>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 96 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 14 }}>
              <IconBubble size={64} tone={palette.primary}>
                <Ionicons
                  name="notifications-off-outline"
                  size={28}
                  color={palette.primary}
                />
              </IconBubble>
              <Text
                style={{
                  color: palette.textMuted,
                  fontFamily: FontFamily.regular,
                  textAlign: "center",
                }}
              >
                {t("notifications.emptyState")}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

export default Notifications;
