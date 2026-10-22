import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { BackHandler, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FontFamily } from "../constants/fonts";
import { Radii, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import AmbientBackdrop from "./arcade/AmbientBackdrop";
import GlowCard from "./arcade/GlowCard";
import PressableScale from "./arcade/Pressable";

import ArrowLeftIcon from "../assets/icons/arrow-left.svg";
import ArrowRightIcon from "../assets/icons/arrow-right.svg";

const LegalDocumentScreen = ({ title, lastUpdated, sections }) => {
  const router = useRouter();
  const { palette, isDark } = usePalette();
  const { t, isRTL } = useTranslation();
  const BackIcon = isRTL ? ArrowRightIcon : ArrowLeftIcon;

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.back();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [router]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <AmbientBackdrop />
      <View className="flex-row items-center px-6 pt-4 pb-2">
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
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }}
        style={{ flex: 1 }}
      >
        <GlowCard
          radius={Radii.xxl}
          intensity="soft"
          contentStyle={{ padding: 20 }}
        >
          <Text
            className="text-3xl"
            style={{ color: palette.text, fontFamily: FontFamily.bold }}
          >
            {title}
          </Text>
          {lastUpdated ? (
            <Text
              className="text-xs mt-2"
              style={{
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {t("legalDocument.lastUpdated", { date: lastUpdated })}
            </Text>
          ) : null}

          {sections?.intro ? (
            <Text
              className="mt-4 text-sm"
              style={{
                color: palette.text,
                fontFamily: FontFamily.regular,
                lineHeight: 24,
              }}
            >
              {sections.intro}
            </Text>
          ) : null}

          {sections?.items?.map((section) => (
            <View key={section.title} className="mt-5">
              <Text
                className="text-lg"
                style={{ color: palette.text, fontFamily: FontFamily.bold }}
              >
                {section.title}
              </Text>
              {section.paragraphs.map((paragraph) => (
                <Text
                  key={paragraph}
                  className="mt-2 text-sm"
                  style={{
                    color: palette.text,
                    fontFamily: FontFamily.regular,
                    lineHeight: 24,
                  }}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </GlowCard>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LegalDocumentScreen;
