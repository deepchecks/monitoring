import { createSlice } from "@reduxjs/toolkit";
import { Monitor } from "../../types/monitor";
import {
  createMonitor,
  deleteMonitor,
  getMonitor,
  updateMonitor,
} from "../requests/monitor";
import { setError, setLoading } from "./helper";

interface InitialStateType {
  allMonitor: Monitor[];
  monitor: Monitor;
  error: string;
  loading: boolean;
}

export const initialState: InitialStateType = {
  allMonitor: [],
  monitor: {} as Monitor,
  error: "",
  loading: false,
};

export const monitorSlice = createSlice({
  name: "monitor",
  initialState,
  reducers: {},
  extraReducers: {
    [createMonitor.pending.type]: setLoading,
    [createMonitor.fulfilled.type]: (state, action) => {
      state.loading = false;
      state.monitor = action.payload;
    },
    [createMonitor.pending.type]: setLoading,
    [deleteMonitor.fulfilled.type]: (state) => {
      state.loading = false;
      state.monitor = {} as Monitor;
    },
    [deleteMonitor.rejected.type]: setError,
    [deleteMonitor.pending.type]: setLoading,
    [getMonitor.fulfilled.type]: (state, action) => {
      state.loading = false;
      state.monitor = action.payload;
    },
    [getMonitor.rejected.type]: setError,
    [updateMonitor.pending.type]: setLoading,
    [updateMonitor.fulfilled.type]: (state, action) => {
      state.loading = false;
      state.monitor = action.payload;
    },
    [updateMonitor.rejected.type]: setError,
  },
});

export default monitorSlice.reducer;
