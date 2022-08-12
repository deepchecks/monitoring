import {
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from "@reduxjs/toolkit";
import axios from "axios";
import { setGraphColor } from "../../../helpers/lineDataChangeFunction";
import MonitorService from "../../../services/MonitorService";
import { ID } from "../../../types";
import { Monitor } from "../../../types/monitor";
import { RootState } from "../../store";
import { initGraph } from "./monitorHelpers";
import {
  CreateMonitorOptions,
  InitialStateType,
  UpdateMonitorOptions,
} from "./monitorTypes";

export const initialState: InitialStateType = {
  charts: [],
  dashboards: { id: 0, name: "", monitors: [] },
  error: "",
  loading: false,
  graph: initGraph,
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

export const getMonitors = createAsyncThunk("monitor/getMonitors", async () => {
  try {
    const monitors = await MonitorService.getMonitors();
    const charts = await axios.all(
      monitors.data.monitors.map(async ({ id }) => {
        const res = await MonitorService.runMonitor(id);

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
  async (monitorId: ID) => {
    try {
      const response = await MonitorService.runMonitor(monitorId);
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
  async ({ checkId, monitor }: UpdateMonitorOptions) => {
    try {
      const response = await MonitorService.updateMonitor(checkId, monitor);
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
      state.graph = initGraph;
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
      state.charts = payload.charts.map((data, index) => ({
        datasets: data.output[3],
        labels: data.time_labels,
        ...setGraphColor(index),
      }));
    });
    builder.addCase(getMonitors.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(runMonitor.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(runMonitor.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.graph = payload.output[3]
        ? { datasets: payload.output[3], labels: payload.time_labels }
        : initGraph;
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

export const { clearMonitorGraph } = monitorSlice.actions;

export const monitorReducer = monitorSlice.reducer;
