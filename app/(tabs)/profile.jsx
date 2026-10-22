import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import AutoHideTabBarScrollView from "../../components/AutoHideTabBarScrollView";
import NotificationsHeaderButton from "../../components/NotificationsHeaderButton";
import ScreenTitle from "../../components/Title";
import WalletHeaderButton from "../../components/WalletHeaderButton";
import BottomSheet from "../../components/arcade/BottomSheet";
import GlowCard from "../../components/arcade/GlowCard";
import IconBubble from "../../components/arcade/IconBubble";
import NeonButton from "../../components/arcade/NeonButton";
import PressableScale from "../../components/arcade/Pressable";
import SelectionRow from "../../components/arcade/SelectionRow";
import ConfirmModal from "../../components/ui/ConfirmModal";
import PasswordInput from "../../components/ui/PasswordInput";
import PopupMessage from "../../components/ui/PopupMessage";
import { FontFamily } from "../../constants/fonts";
import { Radii, glow, withAlpha } from "../../constants/theme";
import { useThemePreference } from "../../hooks/use-color-scheme";
import { usePalette } from "../../hooks/use-palette";
import { unregisterCurrentPushToken } from "../../hooks/use-push-notifications";
import { useTranslation } from "../../hooks/use-translation";
import { reloadApp } from "../../services/appUpdates";
import { logout, verifyAccessToken } from "../../services/authApi";
import { clearAccessToken } from "../../services/authStorage";
import { getUserById, updateUserProfile } from "../../services/userApi";
import { clearCart } from "../../state/cartSlice";
import { clearFavorites } from "../../state/favoritesSlice";
import { clearUser, setUser } from "../../state/userSlice";

import ThemeIcon from "../../assets/icons/crescent.svg";
import LogoutIcon from "../../assets/icons/logout.svg";
import RateUsIcon from "../../assets/icons/rate-us.svg";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bayocard";
const SCREEN_PADDING = 24;

// Appearance keys, and the language list. Language names stay in their own
// language regardless of the app language, matching how pickers
// conventionally read (e.g. iOS Settings) - only "System" is translated.
const THEME_KEYS = ["light", "dark", "system"];
const LANGUAGE_OPTIONS = [
  { key: "system", labelKey: "language.system" },
  { key: "ar", label: "العربية" },
  { key: "en", label: "English" },
];

/** A tappable settings row: icon slot, label, current value, chevron. */
const SettingsRow = ({ icon, label, value, onPress, tone, danger }) => {
  const { palette } = usePalette();
  const { isRTL } = useTranslation();
  const accent = tone ?? palette.primary;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ marginTop: 10 }}
    >
      <GlowCard
        radius={Radii.md}
        tone={danger ? palette.danger : palette.border}
        intensity="soft"
        contentStyle={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 14,
          paddingVertical: 13,
        }}
      >
        <IconBubble size={36} tone={accent}>
          {icon}
        </IconBubble>
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            color: danger ? palette.danger : palette.text,
            fontFamily: FontFamily.medium,
          }}
        >
          {label}
        </Text>
        {value ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              maxWidth: 120,
              color: palette.textMuted,
              fontFamily: FontFamily.regular,
            }}
          >
            {value}
          </Text>
        ) : null}
        <MaterialCommunityIcons
          name={isRTL ? "chevron-left" : "chevron-right"}
          size={20}
          color={palette.textFaint}
        />
      </GlowCard>
    </PressableScale>
  );
};

const ProfileField = ({ label, value, palette }) => (
  <View style={{ marginBottom: 14 }}>
    <Text
      style={{
        fontSize: 11,
        marginBottom: 3,
        color: palette.textFaint,
        fontFamily: FontFamily.regular,
        letterSpacing: 0.5,
        textTransform: "uppercase",
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: 15,
        color: palette.text,
        fontFamily: FontFamily.bold,
      }}
    >
      {value}
    </Text>
  </View>
);

export const Profile = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.user.profile);
  const { palette, gradients, isDark } = usePalette();
  const { t, localePreference, setLocalePreference } = useTranslation();
  const { themePreference, setThemePreference } = useThemePreference();
  const [openSheet, setOpenSheet] = useState(null);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);
  const [confirmValid, setConfirmValid] = useState(false);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    if (!profile) {
      return;
    }
    setName(profile.name || "");
    if (!isEditing) {
      setPassword("");
      setConfirmPassword("");
      setPasswordValid(false);
      setConfirmValid(false);
    }
  }, [profile, isEditing]);

  const refreshProfile = useCallback(async () => {
    try {
      const session = await verifyAccessToken();
      if (!session?.id) {
        return;
      }
      const res = await getUserById(session.id);
      if (res) {
        dispatch(setUser(res));
      }
    } catch {}
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  }, [refreshProfile]);

  const hasChanges = useMemo(() => {
    if (!profile) {
      return false;
    }
    if (name.trim() !== (profile.name || "")) {
      return true;
    }
    return Boolean(password || confirmPassword);
  }, [name, profile, password, confirmPassword]);

  const showPopup = (message, type = "info") => {
    setPopup({ visible: true, message, type });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, visible: false }));
  };

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showPopup(t("profileTab.validationNameRequired"), "warning");
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      showPopup(t("profileTab.validationNameLength"), "warning");
      return;
    }
    if (password || confirmPassword) {
      if (!passwordValid || !confirmValid) {
        showPopup(t("profileTab.validationPassword"), "warning");
        return;
      }
    }
    if (!hasChanges) {
      showPopup(t("profileTab.noChanges"), "info");
      return;
    }
    setIsSaving(true);
    try {
      const payload = { name: trimmedName };
      if (password) {
        payload.password = password;
      }
      const updated = await updateUserProfile(payload);
      if (updated) {
        dispatch(setUser(updated));
        showPopup(t("profileTab.saveSuccess"), "success");
        setIsEditing(false);
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      const code = error?.response?.data?.code;
      if (code === "CHECK_INVALID_NAME") {
        showPopup(t("profileTab.validationNameLength"), "warning");
      } else {
        showPopup(t("profileTab.saveError"), "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setName(profile?.name || "");
    setPassword("");
    setConfirmPassword("");
    setPasswordValid(false);
    setConfirmValid(false);
  };

  const handleLogout = async () => {
    await unregisterCurrentPushToken();
    // Best-effort: revoke the session server-side so it doesn't keep
    // occupying one of this account's device slots. If this fails (e.g. no
    // network, session already gone) still log the user out locally.
    try {
      await logout();
    } catch {}
    await clearAccessToken();
    dispatch(clearUser());
    dispatch(clearCart());
    dispatch(clearFavorites());
    router.replace("/login");
  };

  const handleSelectLanguage = async (key) => {
    const { directionChanged } = await setLocalePreference(key);
    // Switching between an RTL and an LTR language needs a relaunch for
    // I18nManager to take effect, so the sheet closes and hands over to the
    // restart prompt instead of leaving a half-mirrored UI behind it.
    setOpenSheet(null);
    if (directionChanged) {
      setShowRestartPrompt(true);
    }
  };

  const initial = (profile?.name ?? "").trim().charAt(0).toUpperCase();
  const activeLanguage = LANGUAGE_OPTIONS.find(
    (option) => option.key === localePreference,
  );

  return (
    <AutoHideTabBarScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        paddingBottom: 132,
      }}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    >
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <ScreenTitle>{t("profileTab.screenTitle")}</ScreenTitle>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <NotificationsHeaderButton />
          <WalletHeaderButton />
        </View>
      </View>

      {/* Identity banner - avatar, name, phone. */}
      <View
        style={[
          { marginTop: 12, borderRadius: Radii.xl },
          glow(palette.primary, {
            opacity: 0.4,
            radius: 20,
            y: 10,
            elevation: 10,
            isDark,
          }),
        ]}
      >
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: Radii.xl,
            padding: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: withAlpha("#FFFFFF", isDark ? 0.12 : 0.24),
          }}
        >
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: Radii.lg,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: withAlpha("#FFFFFF", 0.16),
              borderWidth: 2,
              borderColor: withAlpha("#FFFFFF", 0.4),
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: FontFamily.bold,
                fontSize: 26,
              }}
            >
              {initial || "?"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: "#FFFFFF",
                fontFamily: FontFamily.bold,
                fontSize: 20,
              }}
            >
              {profile?.name || "-"}
            </Text>
            <Text
              style={{
                marginTop: 3,
                color: withAlpha("#FFFFFF", 0.75),
                fontFamily: FontFamily.regular,
                fontSize: 13,
              }}
            >
              {profile?.phone ? String(profile.phone) : "-"}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <GlowCard
        radius={Radii.lg}
        intensity="soft"
        style={{ marginTop: 16 }}
        contentStyle={{ padding: 16 }}
      >
        <Text
          style={{
            fontSize: 15,
            marginBottom: 14,
            color: palette.text,
            fontFamily: FontFamily.bold,
          }}
        >
          {t("profileTab.accountInfo")}
        </Text>

        <ProfileField
          label={t("profileTab.nameLabel")}
          value={profile?.name || "-"}
          palette={palette}
        />
        <ProfileField
          label={t("profileTab.phoneLabel")}
          value={profile?.phone ? String(profile.phone) : "-"}
          palette={palette}
        />

        {!isEditing ? (
          <NeonButton
            label={t("profileTab.editButton")}
            onPress={handleStartEdit}
            full
          />
        ) : (
          <>
            <PasswordInput
              label={t("profileTab.newPasswordLabel")}
              name="password"
              value={password}
              onChange={setPassword}
              onValidityChange={setPasswordValid}
              placeholder="••••••••"
            />
            <PasswordInput
              label={t("profileTab.confirmPasswordLabel")}
              name="confirmPassword"
              value={confirmPassword}
              confirmValue={password}
              onChange={setConfirmPassword}
              onValidityChange={setConfirmValid}
              placeholder="••••••••"
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <NeonButton
                label={t("profileTab.saveChanges")}
                onPress={handleSaveProfile}
                loading={isSaving}
                disabled={isSaving || name.trim().length > 50}
                style={{ flex: 1 }}
              />
              <NeonButton
                label={t("profileTab.cancel")}
                variant="outline"
                tone={palette.textMuted}
                onPress={handleCancelEdit}
                disabled={isSaving}
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </GlowCard>

      <View style={{ marginTop: 18 }}>
        <SettingsRow
          label={t("profileTab.themeRow")}
          value={t(`theme.${themePreference}`)}
          onPress={() => setOpenSheet("theme")}
          tone="#DAA520"
          icon={
            <ThemeIcon style={{ width: 19, height: 19, fill: "#DAA520" }} />
          }
        />
        <SettingsRow
          label={t("profileTab.languageRow")}
          value={
            activeLanguage?.label ??
            t(activeLanguage?.labelKey ?? "language.system")
          }
          onPress={() => setOpenSheet("language")}
          icon={
            <MaterialCommunityIcons
              name="translate"
              size={19}
              color={palette.primary}
            />
          }
        />
        <SettingsRow
          label={t("profileTab.devicesRow")}
          onPress={() => router.push("/profile/devices")}
          icon={
            <MaterialCommunityIcons
              name="cellphone"
              size={19}
              color={palette.primary}
            />
          }
        />
        {profile?.role === "business" ? (
          <SettingsRow
            label={t("profileTab.settingsRow")}
            onPress={() => router.push("/profile/settings")}
            icon={
              <MaterialCommunityIcons
                name="cog"
                size={19}
                color={palette.primary}
              />
            }
          />
        ) : null}
        <SettingsRow
          label={t("profileTab.rateUsRow")}
          onPress={() => Linking.openURL(PLAY_STORE_URL).catch(() => {})}
          tone={palette.warning}
          icon={
            <RateUsIcon
              style={{ width: 19, height: 19, stroke: palette.warning }}
            />
          }
        />
        <SettingsRow
          label={t("profileTab.aboutUsRow")}
          onPress={() => router.push("/about-us")}
          icon={
            <MaterialCommunityIcons
              name="information-outline"
              size={19}
              color={palette.primary}
            />
          }
        />
        <SettingsRow
          label={t("profileTab.termsRow")}
          onPress={() => router.push("/terms-of-service")}
          icon={
            <MaterialCommunityIcons
              name="file-document-outline"
              size={19}
              color={palette.primary}
            />
          }
        />
        <SettingsRow
          label={t("profileTab.logoutRow")}
          onPress={handleLogout}
          tone={palette.danger}
          danger
          icon={
            <LogoutIcon
              style={{ width: 19, height: 19, stroke: palette.danger }}
            />
          }
        />
      </View>

      <BottomSheet
        visible={openSheet === "theme"}
        title={t("theme.title")}
        onClose={() => setOpenSheet(null)}
      >
        {THEME_KEYS.map((key) => (
          <SelectionRow
            key={key}
            label={t(`theme.${key}`)}
            selected={themePreference === key}
            onPress={() => {
              setThemePreference(key);
              setOpenSheet(null);
            }}
          />
        ))}
      </BottomSheet>

      <BottomSheet
        visible={openSheet === "language"}
        title={t("language.title")}
        onClose={() => setOpenSheet(null)}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <SelectionRow
            key={option.key}
            label={option.label ?? t(option.labelKey)}
            selected={localePreference === option.key}
            onPress={() => handleSelectLanguage(option.key)}
          />
        ))}
      </BottomSheet>

      <ConfirmModal
        visible={showRestartPrompt}
        title={t("language.restartTitle")}
        message={t("language.restartMessage")}
        confirmLabel={t("settings.restartNow")}
        onConfirm={() => {
          setShowRestartPrompt(false);
          reloadApp();
        }}
      />
    </AutoHideTabBarScrollView>
  );
};

export default Profile;
