import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { FontFamily } from "../constants/fonts";
import { Radii, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import PressableScale from "./arcade/Pressable";

import ArrowLeftIcon from "../assets/icons/arrow-left.svg";
import ArrowRightIcon from "../assets/icons/arrow-right.svg";

/**
 * Screen heading. The back affordance is a tinted glass square rather than a
 * bare icon so it reads as a control at a glance, and the eyebrow rule above
 * the title gives every screen the same HUD-like anchor.
 */
const Title = ({ children, className, style, back, eyebrow, ...rest }) => {
  const { palette, isDark } = usePalette();
  const { t, isRTL } = useTranslation();
  const router = useRouter();

  // "Back" points toward the reading-forward direction: right in RTL, left
  // in LTR.
  const BackIcon = isRTL ? ArrowRightIcon : ArrowLeftIcon;

  return (
    <View
      className={className}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginTop: 20,
          marginBottom: 8,
        },
        style,
      ]}
    >
      {back ? (
        <PressableScale
          onPress={() => router.back()}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={{
            width: 40,
            height: 40,
            borderRadius: Radii.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: withAlpha(palette.primary, isDark ? 0.16 : 0.09),
            borderWidth: 1,
            borderColor: withAlpha(palette.primary, isDark ? 0.34 : 0.2),
          }}
        >
          <BackIcon width={22} height={22} color={palette.primary} />
        </PressableScale>
      ) : null}

      <View style={{ flexShrink: 1, flexGrow: 1 }}>
        {eyebrow ? (
          <Text
            numberOfLines={1}
            style={{
              color: palette.accent,
              fontFamily: FontFamily.bold,
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={{
            color: palette.text,
            fontFamily: FontFamily.bold,
            fontSize: 26,
            letterSpacing: 0.2,
          }}
          {...rest}
        >
          {children}
        </Text>
      </View>
    </View>
  );
};

export default Title;
