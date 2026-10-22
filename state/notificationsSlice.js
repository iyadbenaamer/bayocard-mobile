import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Always appends, even if an identical notification (same title/body)
    // was already stacked - each received push is its own entry.
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
    },
    clearNotifications: (state) => {
      state.items = [];
    },
  },
});

export const { addNotification, clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
