import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  ids: [],
  status: "idle",
};

const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    setFavoriteIds: (state, action) => {
      state.ids = Array.isArray(action.payload) ? action.payload : [];
      state.status = "ready";
    },
    addFavoriteId: (state, action) => {
      const id = action.payload;
      if (id && !state.ids.includes(id)) {
        state.ids.push(id);
      }
    },
    removeFavoriteId: (state, action) => {
      state.ids = state.ids.filter((id) => id !== action.payload);
    },
    clearFavorites: (state) => {
      state.ids = [];
      state.status = "idle";
    },
  },
});

export const {
  setFavoriteIds,
  addFavoriteId,
  removeFavoriteId,
  clearFavorites,
} = favoritesSlice.actions;

export const selectFavoriteIds = (state) => state.favorites.ids;

export default favoritesSlice.reducer;
