import { PermissionsAndroid, Platform } from "react-native";

// react-native-bluetooth-classic wraps Android Bluetooth Classic (RFCOMM/SPP)
// and iOS External Accessory. Most thermal receipt printers only support
// Classic Bluetooth, which iOS restricts to MFi-certified accessories, so in
// practice this transport is Android-only for the vast majority of printers.
let RNBluetoothClassic = null;
function getModule() {
  if (RNBluetoothClassic) return RNBluetoothClassic;
  try {
    RNBluetoothClassic = require("react-native-bluetooth-classic").default;
  } catch {
    RNBluetoothClassic = null;
  }
  return RNBluetoothClassic;
}

export function isBluetoothPrintingSupported() {
  return Platform.OS === "android" && getModule() !== null;
}

export async function isBluetoothEnabled() {
  const module = getModule();
  if (!module) return false;
  return module.isBluetoothEnabled();
}

// BLUETOOTH_CONNECT (Android 12+) or ACCESS_FINE_LOCATION (below) are
// "dangerous" runtime permissions - declaring them in the manifest isn't
// enough, the OS permission dialog must be requested and granted or every
// native Bluetooth call below silently fails. BLUETOOTH_SCAN isn't
// requested since nothing here scans/discovers - see getPairedDevices().
async function ensureBluetoothPermissions() {
  if (Platform.OS !== "android") return true;

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// Returns already-paired (bonded) devices only - no live scan/discovery.
// Discovery (BluetoothAdapter.startDiscovery()) proved unreliable enough
// on real hardware to hang indefinitely with no diagnosable cause, and for
// this app's use case it was never actually necessary: a receipt printer
// has to be paired via the OS Bluetooth settings before it's usable here
// anyway, so the printer the merchant wants is always already in the
// bonded list.
export async function getPairedDevices() {
  const module = getModule();
  if (!module) return [];

  if (!(await ensureBluetoothPermissions())) {
    throw new Error("BLUETOOTH_PERMISSION_DENIED");
  }

  if (!(await module.isBluetoothEnabled())) {
    const enabled = await module.requestBluetoothEnabled().catch(() => false);
    if (!enabled) {
      throw new Error("BLUETOOTH_DISABLED");
    }
  }

  const bonded = await module.getBondedDevices();
  return bonded.map((device) => ({
    address: device.address,
    name: device.name || device.address,
  }));
}

// Opening a Bluetooth Classic (SPP) socket means a full RFCOMM channel
// negotiation, which routinely takes 1-3+ seconds - far longer than
// actually transferring a receipt's bytes once connected. Printing had
// been reconnecting (connect + write + disconnect) on every single
// receipt, so that one-time cost was paid again for every card in a
// "print all" run, which is what made Bluetooth printing feel very slow.
// Caching the open connection and reusing it across prints - only
// reconnecting when it actually drops or the merchant points printing at
// a different device - turns that repeated handshake into a one-off cost.
let activeConnection = null; // { address, device }

async function getConnection(module, address) {
  if (activeConnection && activeConnection.address !== address) {
    await closeBluetoothConnection();
  }

  if (activeConnection) {
    try {
      if (await activeConnection.device.isConnected()) {
        return activeConnection.device;
      }
    } catch {
      // fall through and reconnect below
    }
    activeConnection = null;
  }

  if (!(await ensureBluetoothPermissions())) {
    throw new Error("BLUETOOTH_PERMISSION_DENIED");
  }

  const device = await module.connectToDevice(address, {
    connectionType: "binary",
  });
  activeConnection = { address, device };
  return device;
}

// Closes and forgets the cached connection, if any. Call this whenever the
// merchant reconfigures printing away from the current Bluetooth device
// (picks a different one, switches to network, or clears the printer) so a
// stale socket isn't left open on the old device.
export async function closeBluetoothConnection() {
  const connection = activeConnection;
  activeConnection = null;
  if (connection) {
    await connection.device.disconnect().catch(() => {});
  }
}

export async function sendOverBluetooth(payload, { address }) {
  const module = getModule();
  if (!module) {
    throw new Error("BLUETOOTH_NOT_SUPPORTED");
  }
  if (!address) {
    throw new Error("BLUETOOTH_ADDRESS_REQUIRED");
  }

  const device = await getConnection(module, address);

  try {
    // write() base64-encodes Buffers for the bridge itself, so the raw
    // ESC/POS bytes are passed through untouched (no string/delimiter
    // conversion, matching the "binary" connection type used above).
    await device.write(payload);
  } catch (err) {
    // The socket is presumed dead - drop the cache so the next attempt
    // (a retry, or the next card) reconnects instead of reusing it.
    activeConnection = null;
    await device.disconnect().catch(() => {});
    throw err;
  }
}
