export default {
  title: "Receipt Printer",
  networkTab: "Network",
  bluetoothTab: "Bluetooth",
  defaultUserName: "User",
  description:
    "Printing always goes through the printer selected below. The default is a network printer at 127.0.0.1 port 9100 — you can change it to another network printer or a Bluetooth printer.",
  currentPrinterLabel: "Currently saved printer:",
  ipLabel: "Printer IP address",
  ipPlaceholder: "192.168.1.50",
  portLabel: "Port",
  portPlaceholder: "9100",
  saveButton: "Save",
  bluetoothAndroidOnly:
    "Bluetooth printing is only available on Android devices in this version of the app.",
  bluetoothInstructions:
    "Only Bluetooth devices already paired with this device are shown here. To add a new printer, pair it first from the device's Bluetooth settings, then refresh the list.",
  refreshDevicesButton: "Refresh paired devices",
  testPrintButton: "Test print",
  ipRequired: "Please enter the printer's IP address.",
  networkSaved: "Network printer settings saved.",
  bluetoothSelectedTemplate: '"{{name}}" was set as the default printer.',
  bluetoothNotSelected: "Please choose a Bluetooth printer first.",
  testPrintSuccess: "Test print sent successfully.",
  testPrintFailed: "Test print failed. Check the printer connection.",
  noPairedDevices:
    "No paired Bluetooth devices found. Please pair the printer first from the device's Bluetooth settings.",
  bluetoothPermissionDenied:
    "Please grant Bluetooth access so the app can show printers.",
  bluetoothDisabled: "Please turn on Bluetooth on this device first.",
  loadDevicesError: "Couldn't display paired Bluetooth devices.",
};
