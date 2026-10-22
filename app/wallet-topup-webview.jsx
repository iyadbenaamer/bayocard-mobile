import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import { useDispatch } from "react-redux";

import PopupMessage from "../components/ui/PopupMessage";
import ScreenTitle from "../components/Title";
import { Colors } from "../constants/theme";
import { useColorScheme } from "../hooks/use-color-scheme";
import { useTranslation } from "../hooks/use-translation";
import { verifyAccessToken } from "../services/authApi";
import { getUserById } from "../services/userApi";
import { cancelTopup, getTopup } from "../services/walletApi";
import { setUser } from "../state/userSlice";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes
// The gateway hosts the payment on its own page and, when done, redirects to
// the return URL we passed at initiate: "bayocard://topup-return?ref=..&status=..".
// A custom scheme is used on purpose - the WebView cannot load it, so
// onShouldStartLoadWithRequest always fires and we close the page immediately
// instead of relying on a reachable web host. The background status poll stays
// as a fallback for any missed navigation event.
const isReturnUrl = (url) =>
  typeof url === "string" &&
  (url.startsWith("bayocard://topup-return") ||
    url.includes("/wallet/topup/return") ||
    url.includes("/payment-return"));

const parseReturnStatus = (url) => {
  const match = /[?&]status=([^&#]+)/.exec(url || "");
  return match ? decodeURIComponent(match[1]) : null;
};

// The gateway requires a phone at initiate (it 422s without one and 501s on
// anything that is not a real Libyan mobile), and it pre-fills its own phone
// field from that value once Livewire hydrates the page. The amount is the
// only thing this app should decide, so clear that field once - after which
// the customer types their own number. Deliberately one-shot: re-clearing
// would fight their typing. Attribute lookup is done by name rather than a
// CSS selector to avoid escaping "wire:model.defer", and everything is
// best-effort - if the gateway changes its markup this silently does nothing.
const CLEAR_PREFILLED_PHONE_JS = `
(function () {
  if (window.__bayocardPhoneCleared) return;
  var attempts = 0;
  function findPhoneInput() {
    var inputs = document.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.name === 'phone') return el;
      var names = el.getAttributeNames ? el.getAttributeNames() : [];
      for (var j = 0; j < names.length; j++) {
        if (names[j].indexOf('wire:model') === 0 &&
            el.getAttribute(names[j]) === 'phone') {
          return el;
        }
      }
    }
    return null;
  }
  function clearOnce() {
    var el = findPhoneInput();
    if (!el || !el.value) return false;
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    window.__bayocardPhoneCleared = true;
    return true;
  }
  // Try straight away, then keep watching for a few minutes: the gateway
  // fills the field once Livewire hydrates, which can be after the customer
  // picks a wallet.
  if (clearOnce()) return;
  var timer = setInterval(function () {
    attempts += 1;
    if (clearOnce() || attempts > 360) clearInterval(timer);
  }, 500);
  if (window.MutationObserver) {
    var obs = new MutationObserver(function () {
      if (clearOnce()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
true;
`;

const WalletTopupWebview = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { paymentUrl, paymentRef } = useLocalSearchParams();
  const theme = useColorScheme() ?? "light";
  const palette = Colors[theme];
  const { t } = useTranslation();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });
  const resolvedRef = useRef(false);
  const handlingReturnRef = useRef(false);
  const dismissalInProgressRef = useRef(false);
  const allowRemovalRef = useRef(false);

  const showPopup = (message, type = "info") =>
    setPopup({ visible: true, message, type });
  const closePopup = () => setPopup((prev) => ({ ...prev, visible: false }));

  const refreshUser = useCallback(async () => {
    try {
      const session = await verifyAccessToken();
      if (session?.id) {
        const user = await getUserById(session.id);
        if (user) dispatch(setUser(user));
      }
    } catch {
      // balance will refresh next time the transactions tab is focused
    }
  }, [dispatch]);

  const finishWithSuccess = useCallback(async () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    await refreshUser();
    showPopup(t("walletTopupWebview.successMessage"), "success");
    setTimeout(() => router.replace("/(tabs)/transactions"), 900);
  }, [refreshUser, router, t]);

  const finishWithFailure = useCallback(
    (message) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      showPopup(message, "error");
      setTimeout(() => router.back(), 1200);
    },
    [router],
  );

  const finishWithProcessing = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    showPopup(t("walletTopupWebview.processingMessage"), "info");
    setTimeout(() => router.replace("/(tabs)/transactions"), 1400);
  }, [router, t]);

  const checkStatusOnce = useCallback(async () => {
    if (!paymentRef || resolvedRef.current) return;
    try {
      const data = await getTopup(String(paymentRef));
      if (data?.status === "paid") {
        await finishWithSuccess();
      } else if (["failed", "expired"].includes(data?.status)) {
        finishWithFailure(t("walletTopupWebview.failureMessage"));
      }
    } catch {
      // a transient network hiccup shouldn't abort the wait
    }
  }, [paymentRef, finishWithSuccess, finishWithFailure, t]);

  // Called when the WebView hits one of our return URLs.
  const handleReturn = useCallback(
    async (returnedStatus) => {
      if (resolvedRef.current || handlingReturnRef.current) return;
      handlingReturnRef.current = true;

      for (
        let attempt = 0;
        attempt < MAX_POLL_ATTEMPTS && !resolvedRef.current;
        attempt += 1
      ) {
        let data;
        try {
          data = await getTopup(String(paymentRef));
        } catch {
          // keep waiting
        }
        if (data?.status === "paid") {
          await finishWithSuccess();
          return;
        }
        if (["failed", "expired"].includes(data?.status)) {
          finishWithFailure(t("walletTopupWebview.failureMessage"));
          return;
        }
        // The page told us it failed and our side hasn't contradicted it.
        if (returnedStatus === "failed" && attempt >= 1) {
          finishWithFailure(t("walletTopupWebview.failureMessage"));
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      // Give the provider webhook/status endpoint time to settle before
      // leaving the payment screen. The server polls Ezone's paid transactions
      // endpoint while this loop checks our own top-up status.
      finishWithProcessing();
    },
    [paymentRef, finishWithSuccess, finishWithFailure, finishWithProcessing, t],
  );

  useEffect(() => {
    if (!paymentRef) return undefined;
    let cancelled = false;

    const poll = async () => {
      for (
        let attempt = 0;
        attempt < MAX_POLL_ATTEMPTS && !cancelled && !resolvedRef.current;
        attempt += 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled || resolvedRef.current) return;
        await checkStatusOnce();
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentRef, checkStatusOnce]);

  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (!paymentRef || allowRemovalRef.current) return;

        event.preventDefault();
        if (dismissalInProgressRef.current) return;
        dismissalInProgressRef.current = true;

        cancelTopup(String(paymentRef))
          .catch((error) => {
            console.error(
              "[wallet] failed to cancel dismissed top-up",
              String(paymentRef),
              error,
            );
          })
          .finally(() => {
            allowRemovalRef.current = true;
            navigation.dispatch(event.data.action);
          });
      }),
    [navigation, paymentRef],
  );

  const handleShouldStartLoad = (request) => {
    if (isReturnUrl(request?.url)) {
      handleReturn(parseReturnStatus(request.url));
      return false; // don't actually load our placeholder page
    }
    return true;
  };

  const handleNavigationStateChange = (navState) => {
    if (isReturnUrl(navState?.url)) {
      handleReturn(parseReturnStatus(navState.url));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      <View className="px-6 pt-6 pb-2">
        <ScreenTitle back>{t("walletTopupWebview.title")}</ScreenTitle>
      </View>
      <View style={{ flex: 1 }}>
        {paymentUrl ? (
          <WebView
            source={{ uri: String(paymentUrl) }}
            // Keep every scheme in-WebView so onShouldStartLoadWithRequest is
            // what decides - otherwise Android may hand bayocard:// straight to
            // the OS before this screen ever sees it.
            originWhitelist={["*"]}
            startInLoadingState
            onLoadStart={() => setIsPageLoading(true)}
            onLoadEnd={() => setIsPageLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            injectedJavaScript={CLEAR_PREFILLED_PHONE_JS}
          />
        ) : null}
        {isPageLoading ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: palette.background,
            }}
          >
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default WalletTopupWebview;
