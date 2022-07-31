import { combineReducers, configureStore } from "@reduxjs/toolkit";
import slice from "./slice/slice";

const rootReducer = combineReducers({
  slice,
});

const reHydrateStore = () => {
  if (localStorage.getItem("applicationState") !== null) {
    return JSON.parse(localStorage.getItem("applicationState") as string);
  }
};
const localStorageMiddleware =
  ({ getState }: any) =>
  (next: any) =>
  (action: any) => {
    const result = next(action);
    localStorage.setItem("applicationState", JSON.stringify(getState()));
    return result;
  };

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: reHydrateStore(),
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});
