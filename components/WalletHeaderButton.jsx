import { useRouter } from "expo-router";
import { Text } from "react-native";
import { useSelector } from "react-redux";

import WalletIcon from "../assets/icons/wallet.svg";
import { FontFamily } from "../constants/fonts";
import { Radii, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { selectUserProfile } from "../state/store";
import PressableScale from "./arcade/Pressable";

const formatBalance = (value) =>
  new Intl.NumberFormat("ar", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

// Header shortcut to the balance/transactions screen - used on the home,
// favorites, purchase-history, and profile tabs. It doubles as a live
// balance readout, which is the number people open the app to check.
const WalletHeaderButton = () => {
  const router = useRouter();
  const { palette, isDark } = usePalette();
  const { t } = useTranslation();
  const profile = useSelector(selectUserProfile);

  return (
    <PressableScale
      onPress={() => router.push("/(tabs)/transactions")}
      scaleTo={0.93}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t("walletHeaderButton.label")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: Radii.pill,
        backgroundColor: withAlpha(palette.primary, isDark ? 0.16 : 0.09),
        borderWidth: 1,
        borderColor: withAlpha(palette.primary, isDark ? 0.34 : 0.2),
      }}
    >
      <WalletIcon width={18} height={18} color={palette.primary} />
      <Text
        style={{
          color: palette.text,
          fontFamily: FontFamily.bold,
          fontSize: 13,
        }}
      >
        {formatBalance(profile?.balance)}
      </Text>
      <Text
        style={{
          color: palette.textMuted,
          fontFamily: FontFamily.medium,
          fontSize: 10,
        }}
      >
        {t("home.currency")}
      </Text>
    </PressableScale>
  );
};

export default WalletHeaderButton;
