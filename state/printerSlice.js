import { createSlice } from "@reduxjs/toolkit";

// Defaults to the network printer at 127.0.0.1:9100 so printing works
// out of the box; the merchant can switch to another network printer or
// a Bluetooth printer, or clear the selection entirely (type: null) to
// require picking one before printing again. Each transport keeps its
// own config object so switching types doesn't lose the previously
// entered details.
const initialState = {
  type: "network", // "network" | "bluetooth" | null
  network: { host: "127.0.0.1", port: "9100" },
  bluetooth: { address: "", name: "" },
  printQrCode: true,
};

const printerSlice = createSlice({
  name: "printer",
  initialState,
  reducers: {
    setNetworkPrinter: (state, action) => {
      const { host, port } = action.payload || {};
      state.type = "network";
      state.network = { host: host || "", port: port || "9100" };
    },
    setBluetoothPrinter: (state, action) => {
      const { address, name } = action.payload || {};
      state.type = "bluetooth";
      state.bluetooth = { address: address || "", name: name || "" };
    },
    clearPrinter: (state) => {
      state.type = null;
    },
    setPrintQrCode: (state, action) => {
      state.printQrCode = Boolean(action.payload);
    },
  },
});

export const {
  setNetworkPrinter,
  setBluetoothPrinter,
  clearPrinter,
  setPrintQrCode,
} = printerSlice.actions;

export const selectPrinterConfig = (state) => state.printer;
export const selectPrintQrCode = (state) => state.printer.printQrCode !== false;

export default printerSlice.reducer;
