import {
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from "@reduxjs/toolkit";
import axios from "axios";
import CheckService from "../../../services/CheckService";
import { ID } from "../../../types";
import { Monitor } from "../../../types/monitor";
import { RootState } from "../../store";
import { initGraph } from "./checkHelpers";
import {
  CreateCheckOptions,
  InitialStateType,
  RunCheckOptions,
} from "./checkTypes";

export const initialState: InitialStateType = {
  charts: [],
  checks: [],
  error: "",
  loading: false,
  graph: initGraph,
};

export const getChecks = createAsyncThunk(
  "check/getChecks",
  async (modelId: ID) => {
    try {
      const response = await CheckService.getChecks(modelId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const runCheck = createAsyncThunk(
  "check/runCheck",
  async ({ checkId, data }: RunCheckOptions) => {
    try {
      const response = await CheckService.runCheck(checkId, data);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const runChecks = createAsyncThunk(
  "check/runChecks",
  async (monitors: Monitor[]) => {
    try {
      const response = axios.all(
        monitors.map(async ({ check, lookback, data_filter }) => {
          const res = await CheckService.runCheck(check.id, {
            lookback,
            filter: data_filter,
          });

          return res.data;
        })
      );
      return response;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const createCheck = createAsyncThunk(
  "check/createCheck",
  async ({ modelId, data }: CreateCheckOptions) => {
    try {
      const response = await CheckService.createChecks(modelId, data);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const checkSlice = createSlice({
  name: "check",
  initialState,
  reducers: {
    clearChecks: (state) => {
      state.checks = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getChecks.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getChecks.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.checks = payload;
    });
    builder.addCase(getChecks.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(runCheck.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(runCheck.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.graph = payload.output[3]
        ? { datasets: payload.output[3], labels: payload.time_labels }
        : initGraph;
    });
    builder.addCase(runCheck.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(runChecks.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(runChecks.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.charts = payload;
    });
    builder.addCase(runChecks.rejected, (state) => {
      state.loading = false;
    });
  },
});

const checkState = (state: RootState) => state.check;

export const checkSelector = createDraftSafeSelector(
  checkState,
  (state) => state
);

export const { clearChecks } = checkSlice.actions;

export const checkReducer = checkSlice.reducer;
