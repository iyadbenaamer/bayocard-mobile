import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";

import { API_BASE_URL } from "../../services/api";

const CAPTCHA_URL = `${API_BASE_URL}/captcha`;
const WIDGET_HEIGHT = 76;

const CaptchaWidget = ({ onToken, onExpire, onError }) => {
  const [loading, setLoading] = useState(true);

  const handleMessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (data.type === "turnstile-token") {
      onToken?.(data.token);
    } else if (data.type === "turnstile-expired") {
      onExpire?.();
    } else if (data.type === "turnstile-error") {
      onError?.();
    }
  };

  return (
    <View
      style={{
        height: WIDGET_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {loading && (
        <ActivityIndicator style={{ position: "absolute" }} />
      )}
      <WebView
        source={{ uri: CAPTCHA_URL }}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        onError={() => onError?.()}
        style={{
          width: 300,
          height: WIDGET_HEIGHT,
          opacity: loading ? 0 : 1,
          backgroundColor: "transparent",
        }}
        scrollEnabled={false}
        originWhitelist={["*"]}
      />
    </View>
  );
};

export default CaptchaWidget;
