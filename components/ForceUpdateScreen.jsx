import { Ionicons } from "@expo/vector-icons";
import { Linking, Text, View } from "react-native";

import { FontFamily } from "../constants/fonts";
import { Radii } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import AmbientBackdrop from "./arcade/AmbientBackdrop";
import IconBubble from "./arcade/IconBubble";
import NeonButton from "./arcade/NeonButton";

// Rendered in place of the whole app navigator (see app/_layout.jsx) when
// the running app version is below the admin-configured minimum for this
// platform - there is intentionally no way to dismiss or navigate past it.
const ForceUpdateScreen = ({ storeUrl }) => {
  const { palette } = usePalette();
  const { t } = useTranslation();

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
          disabled={!storeUrl}
          onPress={() => storeUrl && Linking.openURL(storeUrl)}
          style={{ marginTop: 26 }}
        />
      </View>
    </View>
  );
};

export default ForceUpdateScreen;
