import {
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from "@reduxjs/toolkit";
import axios from "axios";
import { ChartData } from "chart.js";
import { parseDataForChart } from "../../../helpers/parseDataForChart";
import MonitorService from "../../../services/MonitorService";
import { ChartResponse, GraphData, ID } from "../../../types";
import { DashboardType, Monitor } from "../../../types/monitor";
import { RootState } from "../../store";
import {
  CreateMonitorOptions,
  InitialStateType,
  RunMonitorOptions,
  UpdateMonitorOptions,
} from "./monitorTypes";

export const initialState: InitialStateType = {
  charts: [],
  dashboards: { id: 0, name: "", monitors: [] },
  error: "",
  loading: false,
  graph: {} as ChartResponse,
  monitor: {} as Monitor,
};

export const getMonitor = createAsyncThunk(
  "monitor/getMonitor",
  async (monitorId: ID) => {
    try {
      const response = await MonitorService.getMonitor(monitorId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const getMonitors = createAsyncThunk<
  { charts: ChartResponse[]; dashboard: DashboardType },
  void,
  { state: RootState }
>("monitor/getMonitors", async (_, { getState }) => {
  try {
    const monitors = await MonitorService.getMonitors();

    const charts = await axios.all(
      monitors.data.monitors.map(async ({ id, check: { model_id } }) => {
        const res = await MonitorService.runMonitor(id, {
          end_time: new Date(
            getState().model.modelsMap[model_id].latest_time * 1000
          ),
        });
        return res.data;
      })
    );

    return { charts, dashboard: monitors.data };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(err.message);
    }

    throw new Error("Error");
  }
});

export const createMonitor = createAsyncThunk(
  "monitor/createMonitor",
  async ({ checkId, monitor }: CreateMonitorOptions) => {
    try {
      const response = await MonitorService.createMonitor(checkId, monitor);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const runMonitor = createAsyncThunk(
  "monitor/runMonitor",
  async ({ monitorId, endTime }: RunMonitorOptions) => {
    try {
      const response = await MonitorService.runMonitor(monitorId, {
        end_time: new Date(endTime * 1000),
      });
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const updateMonitor = createAsyncThunk(
  "monitor/updateMonitor",
  async ({ monitorId, monitor }: UpdateMonitorOptions) => {
    try {
      const response = await MonitorService.updateMonitor(monitorId, monitor);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const deleteMonitor = createAsyncThunk(
  "monitor/deleteMonitor",
  async (monitorId: ID) => {
    try {
      const response = await MonitorService.deleteMonitor(monitorId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const monitorSlice = createSlice({
  name: "monitor",
  initialState,
  reducers: {
    clearMonitor: (state) => {
      state.monitor = {} as Monitor;
    },
    clearMonitorGraph: (state) => {
      state.graph = {} as ChartResponse;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createMonitor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createMonitor.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(createMonitor.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteMonitor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteMonitor.fulfilled, (state) => {
      state.loading = false;
      state.monitor = {} as Monitor;
    });
    builder.addCase(deleteMonitor.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getMonitor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getMonitor.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.monitor = payload;
    });
    builder.addCase(getMonitor.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getMonitors.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getMonitors.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.dashboards = payload.dashboard;
      state.charts = payload.charts;
    });
    builder.addCase(getMonitors.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(runMonitor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(runMonitor.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.graph = payload;
    });
    builder.addCase(runMonitor.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(updateMonitor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateMonitor.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(updateMonitor.rejected, (state) => {
      state.loading = false;
    });
  },
});

const monitorState = (state: RootState) => state.monitor;

export const monitorSelector = createDraftSafeSelector(
  monitorState,
  (state) => state
);

export const monitorChartsSelector = createDraftSafeSelector(
  monitorState,
  (state) => {
    if (!state.charts.length) {
      return [];
    }

    return state.charts.map((chart) => parseDataForChart(chart));
  }
);

export const monitorGraphSelector = createDraftSafeSelector(
  monitorState,
  (state): ChartData<"line", GraphData> => {
    if (!Object.keys(state.graph).length) {
      return {
        datasets: [],
      };
    }

    return parseDataForChart(state.graph);
  }
);

export const { clearMonitorGraph } = monitorSlice.actions;

export const monitorReducer = monitorSlice.reducer;
