import { configureStore, Middleware } from "@reduxjs/toolkit";
import { alertReducer } from "./slices/alert/alertSlice";
import { checkReducer } from "./slices/check/checkSlice";
import { modelReducer } from "./slices/model/modelSlice";
import { monitorReducer } from "./slices/monitor/monitorSlice";

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
    alert: alertReducer,
    check: checkReducer,
    model: modelReducer,
    monitor: monitorReducer,
  },
  preloadedState: reHydrateStore(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(localStorageMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
