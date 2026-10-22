import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Text, useWindowDimensions, View } from "react-native";
import { useSelector } from "react-redux";

import CartIcon from "../assets/icons/cart.svg";
import { FontFamily } from "../constants/fonts";
import { glow, withAlpha } from "../constants/theme";
import { usePalette } from "../hooks/use-palette";
import { useTranslation } from "../hooks/use-translation";
import { selectCartCount } from "../state/cartSlice";
import { selectUserProfile } from "../state/store";
import PressableScale from "./arcade/Pressable";

const FAB_SIZE = 58;
const EDGE_OFFSET = 20;
// Clears the floating tab bar (62px tall) plus its bottom inset and margin.
const BOTTOM_OFFSET = 112;

// Positioning approach: literal top/bottom, a swap-immune left:0/right:0
// pair for the wrapper, centering (symmetric, can't be mirrored), and a
// computed translateX (never touched by RN's RTL left/right auto-swap) to
// land exactly EDGE_OFFSET from the edge appropriate to the current writing
// direction - the left edge in RTL, the right edge in LTR, matching the
// standard Material FAB placement convention for each direction.
const CartFab = () => {
  const router = useRouter();
  const { palette, gradients, isDark } = usePalette();
  const { t, isRTL } = useTranslation();
  const user = useSelector(selectUserProfile);
  const count = useSelector(selectCartCount);
  const { width: screenWidth } = useWindowDimensions();

  // Only show for logged-in users
  if (!user) return null;

  const translateX = isRTL
    ? EDGE_OFFSET + FAB_SIZE / 2 - screenWidth / 2
    : screenWidth / 2 - EDGE_OFFSET - FAB_SIZE / 2;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: BOTTOM_OFFSET,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 999,
      }}
    >
      {/* No pulsing halo: the count badge already says the cart is not
          empty, and a button that breathes on its own is a distraction on
          every screen it floats over. */}
      <View style={{ transform: [{ translateX }] }}>
        <PressableScale
          onPress={() => router.navigate("/cart")}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={t("cartFab.cartLabel", { count })}
          style={[
            { borderRadius: FAB_SIZE / 2 },
            glow(palette.primary, {
              opacity: 0.75,
              radius: 18,
              y: 8,
              elevation: 14,
              isDark,
            }),
          ]}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: FAB_SIZE,
              height: FAB_SIZE,
              borderRadius: FAB_SIZE / 2,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: withAlpha("#FFFFFF", 0.25),
            }}
          >
            <CartIcon width={24} height={24} color="#fff" />
          </LinearGradient>

          {count > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: palette.highlight,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 5,
                borderWidth: 2,
                borderColor: palette.background,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 10,
                  fontFamily: FontFamily.bold,
                  lineHeight: 14,
                }}
              >
                {count > 99 ? "99+" : String(count)}
              </Text>
            </View>
          )}
        </PressableScale>
      </View>
    </View>
  );
};

export default CartFab;
