import { createSlice } from "@reduxjs/toolkit";

import getLocalizedText from "../utils/localizedText";

const initialState = {
  items: [],
  warnings: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action) => {
      const item = action.payload;
      if (!item?.id) {
        return;
      }
      const existing = state.items.find((entry) => entry.id === item.id);
      if (existing) {
        existing.quantity += item.quantity ?? 1;
        return;
      }
      state.items.push({
        ...item,
        quantity: item.quantity ?? 1,
      });
    },
    updateItemQuantity: (state, action) => {
      const { id, quantity } = action.payload || {};
      if (!id) {
        return;
      }
      const existing = state.items.find((entry) => entry.id === id);
      if (!existing) {
        return;
      }
      if (!quantity || quantity <= 0) {
        state.items = state.items.filter((entry) => entry.id !== id);
        state.warnings = state.warnings.filter((w) => w.tierId !== id);
        return;
      }
      existing.quantity = quantity;
    },
    removeItem: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter((entry) => entry.id !== id);
      state.warnings = state.warnings.filter((w) => w.tierId !== id);
    },
    clearCart: (state) => {
      state.items = [];
      state.warnings = [];
    },
    setCart: (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
      state.warnings = [];
    },
    applyAvailability: (state, action) => {
      // action.payload: [{ tierId, requested, available }]
      const results = Array.isArray(action.payload) ? action.payload : [];
      const nextWarnings = [];

      for (const { tierId, requested, available } of results) {
        const item = state.items.find((entry) => entry.id === tierId);
        if (!item) continue;

        if (available === 0) {
          // Remove item entirely — none in stock
          state.items = state.items.filter((entry) => entry.id !== tierId);
          nextWarnings.push({
            tierId,
            message: `"${getLocalizedText(item.title)}" غير متوفر حاليًا وتم إزالته من السلة.`,
          });
        } else if (available < requested) {
          item.quantity = available;
          nextWarnings.push({
            tierId,
            message: `الكمية المطلوبة لـ "${getLocalizedText(item.title)}" غير متوفرة. تم تعديل الكمية إلى ${available}.`,
          });
        }
      }

      state.warnings = nextWarnings;
    },
  },
});

export const {
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  setCart,
  applyAvailability,
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartWarnings = (state) => state.cart.warnings;
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

export default cartSlice.reducer;
