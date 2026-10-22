import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import AutoHideTabBarScrollView from "../../components/AutoHideTabBarScrollView";
import ScreenTitle from "../../components/Title";
import InputField from "../../components/ui/InputField";
import PopupMessage from "../../components/ui/PopupMessage";
import { useRequireAuth } from "../../components/RequireAuth";
import { FontFamily } from "../../constants/fonts";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useTranslation } from "../../hooks/use-translation";
import {
  closeBluetoothConnection,
  getPairedDevices,
  isBluetoothPrintingSupported,
} from "../../services/bluetoothPrinter";
import { testPrintTo } from "../../services/printerManager";
import {
  clearPrinter,
  selectPrinterConfig,
  setBluetoothPrinter,
  setNetworkPrinter,
} from "../../state/printerSlice";

const TABS = [
  { key: "network", labelKey: "printerSettings.networkTab", icon: "wifi" },
  { key: "bluetooth", labelKey: "printerSettings.bluetoothTab", icon: "bluetooth" },
];

const PrinterSettingsScreen = () => {
  const authStatus = useRequireAuth();
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const palette = Colors[theme];
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const printer = useSelector(selectPrinterConfig);
  const user = useSelector((state) => state.user);
  const isBusiness = user?.profile?.role === "business";

  // Printing is a business-only feature - keep individual accounts from
  // reaching this screen via a direct link even though the nav entry to
  // it is hidden for them.
  useEffect(() => {
    if (authStatus === "auth" && !isBusiness) {
      router.replace("/profile");
    }
  }, [authStatus, isBusiness, router]);

  const [activeTab, setActiveTab] = useState(printer.type || "network");
  const [host, setHost] = useState(printer.network.host);
  const [port, setPort] = useState(printer.network.port);
  const [devices, setDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: "", type: "info" });

  const showPopup = (message, type = "info") =>
    setPopup({ visible: true, message, type });
  const closePopup = () => setPopup((prev) => ({ ...prev, visible: false }));

  const printerInfo = {
    name: user?.profile?.name || t("printerSettings.defaultUserName"),
    support: user?.support || "",
  };

  // Only already-paired devices are listed - no live scan/discovery (see
  // getPairedDevices() for why). The printer has to be paired via the
  // device's own Bluetooth settings first either way.
  const handleLoadPairedDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const found = await getPairedDevices();
      setDevices(found);
      if (found.length === 0) {
        showPopup(t("printerSettings.noPairedDevices"), "info");
      }
    } catch (err) {
      if (err?.message === "BLUETOOTH_PERMISSION_DENIED") {
        showPopup(t("printerSettings.bluetoothPermissionDenied"), "warning");
      } else if (err?.message === "BLUETOOTH_DISABLED") {
        showPopup(t("printerSettings.bluetoothDisabled"), "warning");
      } else {
        showPopup(t("printerSettings.loadDevicesError"), "error");
      }
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  // Load the paired-devices list as soon as the merchant switches to the
  // Bluetooth tab, rather than requiring an extra manual action first.
  useEffect(() => {
    if (
      activeTab === "bluetooth" &&
      Platform.OS === "android" &&
      isBluetoothPrintingSupported()
    ) {
      handleLoadPairedDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSaveNetwork = () => {
    if (!host.trim()) {
      showPopup(t("printerSettings.ipRequired"), "warning");
      return;
    }
    // Leaving Bluetooth printing behind - don't hold its socket open.
    closeBluetoothConnection();
    dispatch(setNetworkPrinter({ host: host.trim(), port: port.trim() || "9100" }));
    showPopup(t("printerSettings.networkSaved"), "success");
  };

  const handleSelectBluetooth = (device) => {
    // Switching devices - drop any connection cached for the old one.
    closeBluetoothConnection();
    dispatch(setBluetoothPrinter(device));
    showPopup(
      t("printerSettings.bluetoothSelectedTemplate", { name: device.name }),
      "success",
    );
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      if (activeTab === "network") {
        if (!host.trim()) {
          showPopup(t("printerSettings.ipRequired"), "warning");
          return;
        }
        await testPrintTo(
          { type: "network", host: host.trim(), port: port.trim() || "9100" },
          printerInfo,
        );
      } else {
        if (!printer.bluetooth.address) {
          showPopup(t("printerSettings.bluetoothNotSelected"), "warning");
          return;
        }
        await testPrintTo(
          { type: "bluetooth", address: printer.bluetooth.address },
          printerInfo,
        );
      }
      showPopup(t("printerSettings.testPrintSuccess"), "success");
    } catch {
      showPopup(t("printerSettings.testPrintFailed"), "error");
    } finally {
      setIsTesting(false);
    }
  };

  if (authStatus === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (authStatus === "unauth" || authStatus === "inactive" || !isBusiness) {
    return null;
  }

  const isAndroid = Platform.OS === "android";
  const bluetoothSupported = isBluetoothPrintingSupported();

  const renderDeviceList = (onSelect, selectedKey) => (
    <View className="mt-4 gap-2">
      {devices.map((device) => {
        const key = device.address ?? device.deviceId;
        const isSelected = key === selectedKey;
        return (
          <TouchableOpacity
            key={key}
            className="rounded-2xl border px-4 py-3 flex-row items-center justify-between"
            style={{
              borderColor: isSelected ? palette.primary : palette.border,
              backgroundColor: palette.surface,
            }}
            onPress={() => onSelect(device)}
          >
            <Text
              style={{ color: palette.text, fontFamily: FontFamily.medium }}
            >
              {device.name}
            </Text>
            {isSelected ? (
              <Text style={{ color: palette.primary, fontFamily: FontFamily.bold }}>
                ✓
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <AutoHideTabBarScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
    >
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      <ScreenTitle back>{t("printerSettings.title")}</ScreenTitle>

      <View
        className="mt-4 rounded-2xl p-4"
        style={{ backgroundColor: palette.surfaceElevated, borderColor: palette.borderStrong, borderWidth: 1 }}
      >
        <Text
          className="text-sm"
          style={{ color: palette.icon, fontFamily: FontFamily.regular }}
        >
          {t("printerSettings.description")}
        </Text>
        {printer.type ? (
          <View className="flex-row items-center justify-between mt-3">
            <Text style={{ color: palette.text, fontFamily: FontFamily.bold }}>
              {t("printerSettings.currentPrinterLabel")}{" "}
              {printer.type === "network"
                ? `${printer.network.host}:${printer.network.port}`
                : printer.bluetooth.name}
            </Text>
            <TouchableOpacity
              onPress={() => {
                closeBluetoothConnection();
                dispatch(clearPrinter());
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={palette.danger} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View className="flex-row mt-6 rounded-2xl overflow-hidden border" style={{ borderColor: palette.border }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              className="flex-1 py-3 items-center flex-row justify-center gap-1"
              style={{ backgroundColor: isActive ? palette.primary : palette.surface }}
              onPress={() => {
                setActiveTab(tab.key);
                setDevices([]);
              }}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={16}
                color={isActive ? "#fff" : palette.text}
              />
              <Text
                style={{
                  color: isActive ? "#fff" : palette.text,
                  fontFamily: FontFamily.medium,
                }}
              >
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === "network" ? (
        <View className="mt-6">
          <InputField
            label={t("printerSettings.ipLabel")}
            containerClassName="mb-4"
            value={host}
            onChangeText={setHost}
            placeholder={t("printerSettings.ipPlaceholder")}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <InputField
            label={t("printerSettings.portLabel")}
            containerClassName="mb-4"
            value={port}
            onChangeText={setPort}
            placeholder={t("printerSettings.portPlaceholder")}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            className="py-3 rounded-2xl items-center"
            style={{ backgroundColor: palette.primary }}
            onPress={handleSaveNetwork}
          >
            <Text style={{ color: "#fff", fontFamily: FontFamily.medium }}>
              {t("printerSettings.saveButton")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {activeTab === "bluetooth" ? (
        <View className="mt-6">
          {!isAndroid || !bluetoothSupported ? (
            <Text style={{ color: palette.icon, fontFamily: FontFamily.regular }}>
              {t("printerSettings.bluetoothAndroidOnly")}
            </Text>
          ) : (
            <>
              <Text
                className="text-sm mb-3"
                style={{ color: palette.icon, fontFamily: FontFamily.regular }}
              >
                {t("printerSettings.bluetoothInstructions")}
              </Text>
              <TouchableOpacity
                className="py-3 rounded-2xl items-center flex-row justify-center gap-2"
                style={{
                  backgroundColor: palette.primary,
                  opacity: isLoadingDevices ? 0.7 : 1,
                }}
                onPress={handleLoadPairedDevices}
                disabled={isLoadingDevices}
              >
                {isLoadingDevices ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontFamily: FontFamily.medium }}>
                    {t("printerSettings.refreshDevicesButton")}
                  </Text>
                )}
              </TouchableOpacity>
              {renderDeviceList(handleSelectBluetooth, printer.bluetooth.address)}
            </>
          )}
        </View>
      ) : null}

      <TouchableOpacity
        className="mt-6 py-3 rounded-2xl items-center border"
        style={{ borderColor: palette.primary, opacity: isTesting ? 0.7 : 1 }}
        onPress={handleTestPrint}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator color={palette.primary} />
        ) : (
          <Text style={{ color: palette.primary, fontFamily: FontFamily.medium }}>
            {t("printerSettings.testPrintButton")}
          </Text>
        )}
      </TouchableOpacity>
    </AutoHideTabBarScrollView>
  );
};

export default PrinterSettingsScreen;
