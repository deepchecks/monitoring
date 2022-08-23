import {
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from "@reduxjs/toolkit";
import axios from "axios";
import { ChartData } from "chart.js";
import { parseDataForChart } from "../../../helpers/parseDataForChart";
import CheckService from "../../../services/CheckService";
import { ChartResponse, ID } from "../../../types";
import { Monitor } from "../../../types/monitor";
import { RootState } from "../../store";
import {
  CreateCheckOptions,
  InitialStateType,
  RunCheckOptions,
  RunSuiteOptions,
} from "./checkTypes";

export const initialState: InitialStateType = {
  charts: [],
  checks: [],
  error: "",
  loading: false,
  graph: {} as ChartResponse,
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
            start_time: new Date(Date.now() - lookback),
            end_time: new Date(),
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

export const runSuite = createAsyncThunk(
  "check/runSuite",
  async ({ modelVersionId, data }: RunSuiteOptions) => {
    try {
      const response = await CheckService.runSuite(modelVersionId, data);
      return response.data;
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
    clearCheckState: (state) => {
      state.checks = [];
      state.graph = {} as ChartResponse;
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
      state.graph = payload;
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
    builder.addCase(runSuite.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(runSuite.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(runSuite.rejected, (state) => {
      state.loading = false;
    });
  },
});

const checkState = (state: RootState) => state.check;

export const checkSelector = createDraftSafeSelector(
  checkState,
  (state) => state
);

export const checkGraphSelector = createDraftSafeSelector(
  checkState,
  (state): ChartData<"line"> => {
    if (!Object.keys(state.graph).length) {
      return {
        datasets: [],
      };
    }

    return parseDataForChart(state.graph);
  }
);

export const { clearCheckState } = checkSlice.actions;

export const checkReducer = checkSlice.reducer;
