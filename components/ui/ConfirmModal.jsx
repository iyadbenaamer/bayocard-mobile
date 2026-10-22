import { Modal, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { FontFamily } from "../../constants/fonts";
import { Radii, glow } from "../../constants/theme";
import { usePalette } from "../../hooks/use-palette";
import GlowCard from "../arcade/GlowCard";
import NeonButton from "../arcade/NeonButton";

// Small in-app confirmation dialog styled with the app's own palette/fonts,
// for cases (like the language-restart prompt) where the native Alert.alert
// system dialog would look out of place against the app's design.
const ConfirmModal = ({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}) => {
  const { palette, isDark } = usePalette();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        style={{
          flex: 1,
          backgroundColor: palette.overlay,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(180)}
          style={[
            { width: "100%", maxWidth: 360 },
            glow(palette.primary, {
              opacity: 0.45,
              radius: 26,
              y: 12,
              elevation: 18,
              isDark,
            }),
          ]}
        >
          <GlowCard
            radius={Radii.xl}
            intensity="strong"
            fill={palette.surfaceElevated}
            contentStyle={{ padding: 22 }}
          >
            <Text
              style={{
                fontSize: 18,
                color: palette.text,
                fontFamily: FontFamily.bold,
                textAlign: "center",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                marginTop: 10,
                fontSize: 14,
                lineHeight: 22,
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
                textAlign: "center",
              }}
            >
              {message}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
              {onCancel ? (
                <NeonButton
                  label={cancelLabel}
                  variant="outline"
                  tone={palette.textMuted}
                  onPress={onCancel}
                  style={{ flex: 1 }}
                />
              ) : null}
              <NeonButton
                label={confirmLabel}
                onPress={onConfirm}
                style={{ flex: 1 }}
              />
            </View>
          </GlowCard>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default ConfirmModal;
