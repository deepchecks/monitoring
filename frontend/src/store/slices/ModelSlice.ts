import { createSlice } from "@reduxjs/toolkit";
import { Model, ModelColumns } from "../../types/model";
import { getColumns, getModels } from "../requests/model";
import { setError, setLoading } from "./helper";

interface InitialStateType {
  allModels: Model[];
  columns: ModelColumns;
  model: Model;
  error: string;
  loading: boolean;
}

export const initialState: InitialStateType = {
  allModels: [],
  columns: {} as ModelColumns,
  model: {} as Model,
  error: "",
  loading: false,
};

export const modelSlice = createSlice({
  name: "model",
  initialState,
  reducers: {
    clearColumns: (state) => {
      state.columns = {} as ModelColumns;
    },
  },
  extraReducers: {
    [getModels.pending.type]: setLoading,
    [getModels.fulfilled.type]: (state, action) => {
      state.loading = false;
      state.allModels = action.payload;
    },
    [getModels.rejected.type]: setError,
    [getColumns.pending.type]: setLoading,
    [getColumns.fulfilled.type]: (state, action) => {
      state.loading = false;
      state.columns = action.payload;
    },
    [getColumns.rejected.type]: setError,
  },
});

export const { clearColumns } = modelSlice.actions;

export default modelSlice.reducer;
