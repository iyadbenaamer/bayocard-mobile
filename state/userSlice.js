import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  profile: null,
  support: "",
  status: "idle",
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.profile = action.payload?.profile;
      state.support = action.payload?.support || "";
      state.status = "ready";
      state.error = null;
    },
    clearUser: (state) => {
      state.profile = null;
      state.support = "";
      state.status = "idle";
      state.error = null;
    },
    setUserStatus: (state, action) => {
      state.status = action.payload;
    },
    setUserError: (state, action) => {
      state.error = action.payload;
    },
    setUserInactive: (state) => {
      if (state.profile) {
        state.profile.isActive = false;
      } else {
        state.profile = { isActive: false };
      }
      state.status = "ready";
      state.error = null;
    },
  },
});

export const {
  setUser,
  clearUser,
  setUserStatus,
  setUserError,
  setUserInactive,
} = userSlice.actions;

export default userSlice.reducer;
