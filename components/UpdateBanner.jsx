import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { FontFamily } from "../constants/fonts";
import { Radii, glow } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import GlowCard from "./arcade/GlowCard";
import NeonButton from "./arcade/NeonButton";
import PressableScale from "./arcade/Pressable";

// Non-blocking floating banner used both for "a newer store version is
// available" and "an OTA update was downloaded, restart to apply" nudges
// (see app/_layout.jsx AppNavigator) - unlike ForceUpdateScreen this can
// always be dismissed for the current app session.
const UpdateBanner = ({ message, actionLabel, onAction, onDismiss }) => {
  const { palette, isDark } = usePalette();

  return (
    <Animated.View
      entering={FadeInUp.duration(260)}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        // Sits above the floating tab bar rather than behind it.
        bottom: 96,
        zIndex: 50,
      }}
    >
      <GlowCard
        radius={Radii.lg}
        tone={palette.accent}
        intensity="strong"
        fill={palette.surfaceElevated}
        style={glow(isDark ? "#000" : palette.primary, {
          opacity: 0.5,
          radius: 18,
          y: 8,
          elevation: 14,
          isDark,
        })}
        contentStyle={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            color: palette.text,
            fontFamily: FontFamily.medium,
          }}
        >
          {message}
        </Text>
        <NeonButton label={actionLabel} size="sm" onPress={onAction} />
        <PressableScale onPress={onDismiss} scaleTo={0.85} hitSlop={8}>
          <Ionicons name="close" size={18} color={palette.textFaint} />
        </PressableScale>
      </GlowCard>
    </Animated.View>
  );
};

export default UpdateBanner;
