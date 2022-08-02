import { configureStore, Middleware } from "@reduxjs/toolkit";
import slice from "./slice/slice";
import checkSlice from "./slices/CheckSlice";
import modelSlice from "./slices/ModelSlice";
import monitorSlice from "./slices/MonitorSlice";

const reHydrateStore = () => {
  if (localStorage.getItem("applicationState") !== null) {
    return JSON.parse(localStorage.getItem("applicationState") as string);
  }
};
const localStorageMiddleware: Middleware =
  ({ getState }) =>
  (next) =>
  (action) => {
    const result = next(action);
    localStorage.setItem("applicationState", JSON.stringify(getState()));
    return result;
  };

export const store = configureStore({
  reducer: {
    slice,
    check: checkSlice,
    model: modelSlice,
    monitor: monitorSlice,
  },
  preloadedState: reHydrateStore(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(localStorageMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
