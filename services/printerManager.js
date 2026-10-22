import { store } from "../state/store";
import { buildReceiptBuffer, sendOverNetwork } from "./printUtils";
import { sendOverBluetooth } from "./bluetoothPrinter";

async function sendToConfiguredPrinter(buffer) {
  const printer = store.getState().printer;

  switch (printer.type) {
    case "network":
      if (!printer.network.host) {
        throw new Error("NO_PRINTER_CONFIGURED");
      }
      return sendOverNetwork(buffer, {
        host: printer.network.host,
        port: Number(printer.network.port) || 9100,
      });

    case "bluetooth":
      if (!printer.bluetooth.address) {
        throw new Error("NO_PRINTER_CONFIGURED");
      }
      return sendOverBluetooth(buffer, { address: printer.bluetooth.address });

    default:
      throw new Error("NO_PRINTER_CONFIGURED");
  }
}

export async function printReceipt(cardData, info) {
  // Arabic content is sent as a rendered bitmap (see buildReceiptBuffer),
  // so the same buffer prints identically on any configured ESC/POS
  // printer - no separate encodings to build per transport.
  const buffer = await buildReceiptBuffer(cardData, info);

  // Only the printer the merchant explicitly selected in Printer Settings
  // is ever used - no probing of a device's built-in printer. If nothing
  // is selected, sendToConfiguredPrinter throws NO_PRINTER_CONFIGURED so
  // the caller can alert the user.
  await sendToConfiguredPrinter(buffer);
}

// target: { type: "network", host, port } | { type: "bluetooth", address }
export async function testPrintTo(target, info) {
  const buffer = await buildReceiptBuffer(
    {
      card: { code: "0000000000000000", serialNumber: "TEST-0001" },
      title: "طباعة تجريبية",
    },
    info,
  );

  switch (target.type) {
    case "network":
      return sendOverNetwork(buffer, {
        host: target.host,
        port: Number(target.port) || 9100,
      });
    case "bluetooth":
      return sendOverBluetooth(buffer, { address: target.address });
    default:
      throw new Error("UNKNOWN_PRINTER_TYPE");
  }
}
