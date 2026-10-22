import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSelector } from "react-redux";

import NotificationIcon from "../assets/icons/notification.svg";
import { Radii, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import PressableScale from "./arcade/Pressable";

// Header shortcut to the notifications feed - mirrors WalletHeaderButton,
// used on the same tabs (home, favorites, purchase-history, profile).
const NotificationsHeaderButton = () => {
  const router = useRouter();
  const { palette, isDark } = usePalette();
  const { t } = useTranslation();
  // No per-notification read flag exists, so the dot signals "the feed has
  // something in it" rather than "unread" - honest for what the state knows.
  const hasNotifications = useSelector(
    (state) => state.notifications.items.length > 0,
  );

  return (
    <PressableScale
      onPress={() => router.push("/notifications")}
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t("notificationsHeaderButton.label")}
      style={{
        width: 38,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: Radii.pill,
        backgroundColor: withAlpha(palette.primary, isDark ? 0.16 : 0.09),
        borderWidth: 1,
        borderColor: withAlpha(palette.primary, isDark ? 0.34 : 0.2),
      }}
    >
      <NotificationIcon width={19} height={19} color={palette.primary} />
      {hasNotifications ? (
        <View
          style={{
            position: "absolute",
            top: 7,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: palette.highlight,
            borderWidth: 1.5,
            borderColor: palette.background,
          }}
        />
      ) : null}
    </PressableScale>
  );
};

export default NotificationsHeaderButton;
