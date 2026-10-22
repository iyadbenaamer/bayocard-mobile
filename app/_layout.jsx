import "../global.css";

import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  useFonts,
} from "@expo-google-fonts/tajawal";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Text,
  TextInput,
} from "react-native";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import ForceUpdateScreen from "../components/ForceUpdateScreen";
import ReceiptCaptureHost from "../components/print/ReceiptCaptureHost";
import UpdateBanner from "../components/UpdateBanner";
import { FontFamily } from "../constants/fonts";
import { Colors } from "../constants/theme";
import {
  ThemePreferenceProvider,
  useColorScheme,
} from "../hooks/use-color-scheme";
import { LocaleProvider, useLocale } from "../hooks/use-locale";
import { useTranslation } from "../hooks/use-translation";
import { useAppUpdates } from "../hooks/use-app-updates";
import { usePushNotifications } from "../hooks/use-push-notifications";
import { checkAppVersionStatus } from "../services/appVersionApi";
import { persistor, store, selectUserProfile } from "../state/store";

// How long the splash screen will wait on the version-check network call
// before giving up and letting the user in - a slow/unreachable server
// should never strand users on the splash screen (fail-open).
const VERSION_CHECK_TIMEOUT_MS = 4000;

export const unstable_settings = { anchor: "(tabs)" };

SplashScreen.preventAutoHideAsync();

export const RootLayout = () => {
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  const [versionStatus, setVersionStatus] = useState({
    checked: false,
    blocked: false,
    updateAvailable: false,
    storeUrl: null,
  });

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setVersionStatus((prev) => ({ ...prev, checked: true }));
    }, VERSION_CHECK_TIMEOUT_MS);

    checkAppVersionStatus()
      .then((result) => {
        if (cancelled) return;
        clearTimeout(timeout);
        setVersionStatus({ checked: true, ...result });
      })
      .catch((err) => {
        console.error("App version check failed:", err);
        if (cancelled) return;
        clearTimeout(timeout);
        setVersionStatus((prev) => ({ ...prev, checked: true }));
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LocaleProvider>
          <RootLayoutGate
            fontsLoaded={fontsLoaded}
            versionStatus={versionStatus}
          />
        </LocaleProvider>
      </PersistGate>
    </Provider>
  );
};

// Splitting this out lets the splash screen wait on the locale preference
// (loaded from SecureStore inside LocaleProvider) in addition to fonts and
// the version check - I18nManager.forceRTL must be called with the real
// stored preference, not a placeholder default, before anything ever
// renders (see hooks/use-locale.js for why getting this order wrong makes
// the app fight the user's chosen writing direction).
const RootLayoutGate = ({ fontsLoaded, versionStatus }) => {
  const { isLoading: localeLoading } = useLocale();
  const readyToRender = fontsLoaded && versionStatus.checked && !localeLoading;

  useEffect(() => {
    if (!readyToRender) {
      return;
    }

    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = [
      {
        fontFamily: FontFamily.regular,
      },
      Text.defaultProps.style,
    ];

    TextInput.defaultProps = TextInput.defaultProps || {};
    TextInput.defaultProps.style = [
      {
        fontFamily: FontFamily.regular,
      },
      TextInput.defaultProps.style,
    ];

    SplashScreen.hideAsync();
  }, [readyToRender]);

  if (!readyToRender) {
    return null;
  }

  return (
    <ThemePreferenceProvider>
      {versionStatus.blocked ? (
        <ForceUpdateScreen storeUrl={versionStatus.storeUrl} />
      ) : (
        <AppNavigator
          updateAvailable={versionStatus.updateAvailable}
          storeUrl={versionStatus.storeUrl}
        />
      )}
    </ThemePreferenceProvider>
  );
};

const AppNavigator = ({ updateAvailable, storeUrl }) => {
  const theme = useColorScheme() ?? "light";
  const palette = Colors[theme];
  const { t } = useTranslation();
  const profile = useSelector(selectUserProfile);
  usePushNotifications(profile);
  const { status: otaStatus, reloadApp } = useAppUpdates({ autoCheck: true });
  const [dismissedOta, setDismissedOta] = useState(false);
  const [dismissedStoreUpdate, setDismissedStoreUpdate] = useState(false);
  const navigationTheme = {
    ...(theme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      primary: palette.primary,
    },
  };
  return (
    <ThemeProvider value={navigationTheme}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: palette.background }}
      >
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: palette.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen
            name="terms-of-service"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="privacy-policy"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="about-us" options={{ headerShown: false }} />
          <Stack.Screen name="verify" options={{ headerShown: false }} />
          <Stack.Screen
            name="forgot-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="verify-reset" options={{ headerShown: false }} />
          <Stack.Screen
            name="reset-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="inactive" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="profile/settings"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/printer-settings"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/devices"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/api-keys"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="cart" options={{ headerShown: false }} />
          <Stack.Screen name="cards/index" options={{ headerShown: false }} />
          <Stack.Screen
            name="cards/[typeId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="notifications/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="exchange" options={{ headerShown: false }} />
          <Stack.Screen
            name="exchange-confirm"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="wallet-topup" options={{ headerShown: false }} />
          <Stack.Screen
            name="wallet-topup-webview"
            options={{ headerShown: false }}
          />
        </Stack>
      </KeyboardAvoidingView>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <ReceiptCaptureHost />
      {otaStatus === "downloaded" && !dismissedOta ? (
        <UpdateBanner
          message={t("layout.otaDownloadedMessage")}
          actionLabel={t("layout.restartAction")}
          onAction={reloadApp}
          onDismiss={() => setDismissedOta(true)}
        />
      ) : (
        updateAvailable &&
        !dismissedStoreUpdate && (
          <UpdateBanner
            message={t("layout.storeUpdateAvailableMessage")}
            actionLabel={t("layout.updateAction")}
            onAction={() => storeUrl && Linking.openURL(storeUrl)}
            onDismiss={() => setDismissedStoreUpdate(true)}
          />
        )
      )}
    </ThemeProvider>
  );
};

export default RootLayout;
