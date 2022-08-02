import { createSlice } from "@reduxjs/toolkit";
import { Check, CheckGraph } from "../../types/check";
import { getChecks, runCheck } from "../requests/check";
import { setError, setLoading } from "./helper";

interface InitialStateType {
  checks: Check[];
  error: string;
  loading: boolean;
  graph: CheckGraph;
}

export const initialState: InitialStateType = {
  checks: [],
  error: "",
  loading: false,
  graph: {} as CheckGraph,
};

export const checkSlice = createSlice({
  name: "check",
  initialState,
  reducers: {
    clearCheckState: (state) => {
      state.checks = [];
      state.graph = {} as CheckGraph;
    },
  },
  extraReducers: {
    [getChecks.pending.type]: setLoading,
    [getChecks.fulfilled.type]: (state, action) => {
      state.loading = false;
      state.checks = action.payload;
    },
    [getChecks.rejected.type]: setError,
    [runCheck.pending.type]: setLoading,
    [runCheck.fulfilled.type]: (state, action) => {
      state.loading = false;
      state.graph = action.payload;
    },
    [runCheck.rejected.type]: setError,
  },
});

export const { clearCheckState } = checkSlice.actions;

export default checkSlice.reducer;
