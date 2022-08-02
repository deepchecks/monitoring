import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";

export const useTypedDispatch = () => useDispatch<AppDispatch>();
export const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useMonitorSelector = () =>
  useTypedSelector((state) => state.monitor);
export const useModelSelector = () => useTypedSelector((state) => state.model);
export const useCheckSelector = () => useTypedSelector((state) => state.check);
