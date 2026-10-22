import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

import { FontFamily } from "../constants/fonts";
import { Radii, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { formatExpiryDate } from "../utils/formatDate.js";
import GlowCard from "./arcade/GlowCard";
import PressableScale from "./arcade/Pressable";

// Splits a code/PIN into 4-character blocks, matching how the leading
// gift-card brands (Steam, Google Play, Apple...) space out redemption
// codes for readability.
const groupCode = (value) =>
  (String(value ?? "").match(/.{1,4}/g) || [String(value ?? "")]).join("  ");

const resolveImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("/")) {
    return `${process.env.EXPO_PUBLIC_API_URL}${path}`;
  }
  return path;
};

const CodeField = ({ label, value, palette, onCopy, accessibilityLabel }) => (
  <View className="mt-3">
    <Text
      className="text-[11px] mb-1.5"
      style={{ color: palette.textMuted, fontFamily: FontFamily.medium }}
    >
      {label}
    </Text>
    <View
      className="flex-row items-center justify-between px-4 py-3"
      style={{
        borderRadius: Radii.lg,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: withAlpha(palette.accent, 0.45),
        backgroundColor: withAlpha(palette.accent, 0.07),
      }}
    >
      <Text
        className="flex-1 text-xl"
        style={{
          direction: "ltr",
          textAlign: "center",
          color: palette.text,
          fontFamily: FontFamily.bold,
          letterSpacing: 3,
          flexWrap: "wrap",
        }}
      >
        {groupCode(value)}
      </Text>
      <PressableScale
        onPress={onCopy}
        scaleTo={0.85}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 8,
          backgroundColor: palette.accent,
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <MaterialCommunityIcons
          name="content-copy"
          size={15}
          color={palette.onAccent}
        />
      </PressableScale>
    </View>
  </View>
);

// A single redeemed card rendered like a physical gift card: brand art (or a
// brand gradient when no art is set) up top, then the code/PIN in
// voucher-style dashed boxes below.
const RedeemedCardTile = ({
  card,
  title,
  tierName,
  image,
  showExpiryDateDay,
  isBusiness,
  palette,
  onPrint,
  onCopy,
}) => {
  const { t } = useTranslation();
  const { gradients } = usePalette();
  const imageUri = resolveImageUrl(image);

  return (
    <GlowCard
      radius={Radii.xxl}
      intensity="strong"
      style={{ marginBottom: 16 }}
      contentStyle={{ padding: 0 }}
    >
      {/* Card face - a brand gradient stands in when no art is uploaded, so
          a card without artwork still looks issued rather than unfinished. */}
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          aspectRatio: 1.9,
          overflow: "hidden",
        }}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={imageUri}
          />
        ) : (
          <MaterialCommunityIcons
            name="wallet-giftcard"
            size={64}
            color="rgba(255,255,255,0.14)"
            style={{ position: "absolute", right: 12, bottom: -6 }}
          />
        )}
        {/* Scrim so the header text stays legible over any art */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: imageUri ? "rgba(0,0,0,0.34)" : "transparent",
          }}
        />
        {/* Subtle diagonal sheen for a bit of shine, like a laminated card */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: "55%",
            height: "220%",
            top: "-60%",
            left: "-15%",
            backgroundColor: "rgba(255,255,255,0.08)",
            transform: [{ rotate: "20deg" }],
          }}
        />

        <View className="flex-1 p-4 justify-between">
          <View className="flex-row items-start justify-between">
            <View
              className="w-9 h-7 rounded-md"
              style={{ backgroundColor: "#e8c874", opacity: 0.92 }}
            />
            {isBusiness ? (
              <PressableScale
                onPress={onPrint}
                scaleTo={0.88}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.22)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
                accessibilityRole="button"
                accessibilityLabel={t("redeemedCardTile.print")}
              >
                <MaterialCommunityIcons
                  name="printer-outline"
                  size={18}
                  color="#fff"
                />
              </PressableScale>
            ) : null}
          </View>

          <View>
            <Text
              numberOfLines={2}
              className="text-base mb-2"
              style={{
                color: "#fff",
                fontFamily: FontFamily.bold,
                textShadowColor: "rgba(0,0,0,0.35)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {tierName ? `${tierName} - ${title}` : title}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text
                numberOfLines={1}
                className="text-[11px] flex-1"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: FontFamily.regular,
                }}
              >
                {card.serialNumber}
              </Text>
              <Text
                className="text-[11px]"
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontFamily: FontFamily.bold,
                }}
              >
                bayocard
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Code panel */}
      <View className="px-4 pt-1 pb-4">
        <CodeField
          label={t("redeemedCardTile.codeLabel")}
          value={card.code}
          palette={palette}
          onCopy={() => onCopy(card.code)}
          accessibilityLabel={t("redeemedCardTile.copyCode")}
        />
        {card.pin ? (
          <CodeField
            label={t("redeemedCardTile.pinLabel")}
            value={card.pin}
            palette={palette}
            onCopy={() => onCopy(card.pin)}
            accessibilityLabel={t("redeemedCardTile.copyPin")}
          />
        ) : null}
        {card.expiryDate ? (
          <View className="flex-row items-center mt-3 gap-1.5">
            <MaterialCommunityIcons
              name="calendar"
              size={14}
              color={palette.textMuted}
            />
            <Text
              className="text-xs"
              style={{
                color: palette.textMuted,
                fontFamily: FontFamily.regular,
              }}
            >
              {t("redeemedCardTile.expiryDate")}
            </Text>
            <Text
              className="text-xs"
              style={{
                direction: "ltr",
                color: palette.text,
                fontFamily: FontFamily.bold,
              }}
            >
              {formatExpiryDate(card.expiryDate, showExpiryDateDay !== false)}
            </Text>
          </View>
        ) : null}
      </View>
    </GlowCard>
  );
};

export default RedeemedCardTile;
