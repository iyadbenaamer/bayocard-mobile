import { configureStore, combineReducers } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";

import userReducer from "./userSlice";
import cartReducer from "./cartSlice";
import printerReducer from "./printerSlice";
import favoritesReducer from "./favoritesSlice";
import notificationsReducer from "./notificationsSlice";

const rootReducer = combineReducers({
  user: userReducer,
  cart: cartReducer,
  printer: printerReducer,
  favorites: favoritesReducer,
  notifications: notificationsReducer,
});

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["user", "cart", "printer", "notifications"],
  // Bursts of rapid dispatches (e.g. tapping the cart quantity stepper
  // repeatedly) would otherwise trigger an AsyncStorage write per action;
  // batching them keeps that bridge/storage I/O off the hot path on
  // low-spec POS hardware.
  throttle: 1000,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export const selectUserProfile = (state) => state.user.profile;
