import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Linking, Text, View } from "react-native";

import { FontFamily } from "../constants/fonts";
import { Radii } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import {
  isInAppUpdatesAvailable,
  startPlayUpdate,
} from "../modules/in-app-updates/index.js";
import AmbientBackdrop from "./arcade/AmbientBackdrop";
import IconBubble from "./arcade/IconBubble";
import NeonButton from "./arcade/NeonButton";

// Rendered in place of the whole app navigator (see app/_layout.jsx) when
// the running app version is below the admin-configured minimum for this
// platform - there is intentionally no way to dismiss or navigate past it.
const ForceUpdateScreen = ({ storeUrl }) => {
  const { palette } = usePalette();
  const { t } = useTranslation();

  // Opens Play's full-screen in-app update straight away, since the app is
  // unusable until updated anyway. Only once on mount - re-opening it on
  // every return to the foreground would trap the user in Play's dialog
  // after cancelling it, as Play's own screen backgrounds the app.
  useEffect(() => {
    startPlayUpdate("immediate");
  }, []);

  // Falls back to the store page wherever Play can't serve the update
  // (iOS, sideloaded installs, or Play not offering it to this device yet).
  const handleUpdate = async () => {
    const result = await startPlayUpdate("immediate");
    if (result === "unavailable" && storeUrl) Linking.openURL(storeUrl);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.background,
        justifyContent: "center",
      }}
    >
      <AmbientBackdrop grid />
      <View className="px-6 items-center">
        <IconBubble
          size={88}
          radius={Radii.xxl}
          variant="gradient"
          style={{ marginBottom: 22 }}
        >
          <Ionicons name="rocket" size={38} color="#FFFFFF" />
        </IconBubble>
        <Text
          className="text-xl text-center"
          style={{ color: palette.text, fontFamily: FontFamily.bold }}
        >
          {t("forceUpdate.title")}
        </Text>
        <Text
          className="text-sm text-center mt-3 leading-6"
          style={{ color: palette.textMuted, fontFamily: FontFamily.regular }}
        >
          {t("forceUpdate.body")}
        </Text>
        <NeonButton
          label={t("forceUpdate.updateNow")}
          size="lg"
          full
          disabled={!storeUrl && !isInAppUpdatesAvailable()}
          onPress={handleUpdate}
          style={{ marginTop: 26 }}
        />
      </View>
    </View>
  );
};

export default ForceUpdateScreen;
