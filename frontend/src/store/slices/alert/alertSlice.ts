import {
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from "@reduxjs/toolkit";
import AlertService from "../../../services/AlertService";
import { ID } from "../../../types";
import { RootState } from "../../store";
import { initCount } from "./alertHelpers";
import { InitialStateType } from "./alertTypes";

export const initialState: InitialStateType = {
  error: "",
  loading: false,
  count: initCount,
};

export const getAlertsCount = createAsyncThunk(
  "check/getAlertsCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await AlertService.getAlertsCount();
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

export const getAlertsCountById = createAsyncThunk(
  "check/getAlertsCountById",
  async (modelId: ID, { rejectWithValue }) => {
    try {
      const response = await AlertService.getAlertsCountById(modelId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

export const alertSlice = createSlice({
  name: "check",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAlertsCount.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getAlertsCount.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.count = Object.keys(payload).length ? payload : initCount;
    });
    builder.addCase(getAlertsCount.rejected, (state) => {
      state.loading = false;
    });
  },
});

const alertState = (state: RootState) => state.alert;

export const alertSelector = createDraftSafeSelector(
  alertState,
  (state) => state
);

export const alertReducer = alertSlice.reducer;
