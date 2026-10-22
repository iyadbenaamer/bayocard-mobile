const { withAndroidManifest } = require("@expo/config-plugins");

// app.json's android.permissions field only accepts plain permission names,
// but a couple of the Bluetooth permissions need extra attributes to follow
// Android's current best practices (avoid requesting legacy permissions on
// API 31+, and avoid implying the app derives physical location from scans).
const MANIFEST_ATTRIBUTES = {
  "android.permission.BLUETOOTH": { "android:maxSdkVersion": "30" },
  "android.permission.BLUETOOTH_ADMIN": { "android:maxSdkVersion": "30" },
  "android.permission.ACCESS_FINE_LOCATION": { "android:maxSdkVersion": "30" },
  "android.permission.BLUETOOTH_SCAN": {
    "android:usesPermissionFlags": "neverForLocation",
  },
};

module.exports = function withBluetoothManifestAttributes(config) {
  return withAndroidManifest(config, (config) => {
    const permissions = config.modResults.manifest["uses-permission"] || [];
    permissions.forEach((permission) => {
      const name = permission.$?.["android:name"];
      const extraAttrs = name && MANIFEST_ATTRIBUTES[name];
      if (extraAttrs) {
        Object.assign(permission.$, extraAttrs);
      }
    });
    return config;
  });
};
