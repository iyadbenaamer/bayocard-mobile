import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import { useTranslation } from "../../hooks/use-translation";
import IconBubble from "../arcade/IconBubble";
import PressableScale from "../arcade/Pressable";

const ICON_BY_TYPE = {
  success: "checkmark-circle",
  error: "close-circle",
  warning: "warning",
  info: "information-circle",
};

const PopupMessage = ({
  visible,
  message,
  type = "info",
  duration = 3000,
  onClose,
}) => {
  const { palette, isDark } = usePalette();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, duration);

    return () => clearTimeout(timerId);
  }, [visible, duration, onClose]);

  if (!visible) {
    return null;
  }

  const toneByType = {
    success: palette.success,
    error: palette.danger,
    warning: palette.warning,
    info: palette.primary,
  };
  const tone = toneByType[type] ?? palette.primary;

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={{
        position: "absolute",
        top: insets.top + 12,
        left: 16,
        right: 16,
        zIndex: 50,
      }}
    >
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: palette.surfaceElevated,
            borderColor: withAlpha(tone, 0.5),
            borderWidth: 1,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: Radii.lg,
          },
          glow(tone, { opacity: 0.4, radius: 16, y: 6, elevation: 10, isDark }),
        ]}
      >
        <IconBubble size={34} tone={tone}>
          <Ionicons
            name={ICON_BY_TYPE[type] ?? ICON_BY_TYPE.info}
            size={18}
            color={tone}
          />
        </IconBubble>

        <Text
          style={{
            flex: 1,
            color: palette.text,
            fontFamily: FontFamily.medium,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {message}
        </Text>

        <PressableScale
          onPress={onClose}
          scaleTo={0.85}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("popupMessage.closeMessage")}
        >
          <Ionicons name="close" size={18} color={palette.textFaint} />
        </PressableScale>
      </View>
    </Animated.View>
  );
};

export default PopupMessage;
