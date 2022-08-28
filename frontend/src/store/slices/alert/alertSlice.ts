import {
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import AlertService from "../../../services/AlertService";
import { ID } from "../../../types";
import { AlertRule, AlertRulesParams } from "../../../types/alert";
import { setLoading } from "../../helpers";
import { RootState } from "../../store";
import { initCount } from "./alertHelpers";
import { InitialStateType } from "./alertTypes";

export const initialState: InitialStateType = {
  alerts: [],
  alertRule: {} as AlertRule,
  alertRules: [],
  error: "",
  loading: false,
  count: initCount,
};

export const getAlertRules = createAsyncThunk(
  "check/getAlertRules",
  async (params: AlertRulesParams, { rejectWithValue }) => {
    try {
      const response = await AlertService.getAlertRules(params);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

export const getAlertsByAlertRuleId = createAsyncThunk(
  "check/getAlertsByAlertRuleId",
  async (alertRuleId: ID, { rejectWithValue }) => {
    try {
      const response = await AlertService.getAlertsByAlertRuleId(alertRuleId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

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

export const resolveAllAlerts = createAsyncThunk(
  "check/resolveAllAlerts",
  async (alertRuleId: ID) => {
    try {
      const response = await AlertService.resolveAllAlerts(alertRuleId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw err.message;
      }

      throw err;
    }
  }
);

export const resolveAlert = createAsyncThunk(
  "check/resolveAlert",
  async (alertRuleId: ID) => {
    try {
      const response = await AlertService.resolveAlert(alertRuleId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw err.message;
      }

      throw err;
    }
  }
);

export const alertSlice = createSlice({
  name: "check",
  initialState,
  reducers: {
    setAlertRule(state, { payload }: PayloadAction<AlertRule>) {
      state.alertRule = payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getAlertRules.pending, setLoading);
    builder.addCase(getAlertRules.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.alertRules = payload;
    });
    builder.addCase(getAlertRules.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getAlertsByAlertRuleId.pending, setLoading);
    builder.addCase(getAlertsByAlertRuleId.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.alerts = payload;
    });
    builder.addCase(getAlertsByAlertRuleId.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getAlertsCount.pending, setLoading);
    builder.addCase(getAlertsCount.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.count = Object.keys(payload).length ? payload : initCount;
    });
    builder.addCase(getAlertsCount.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(resolveAllAlerts.pending, setLoading);
    builder.addCase(resolveAllAlerts.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(resolveAllAlerts.rejected, (state, { error }) => {
      state.loading = false;
      state.error = error as string;
    });
    builder.addCase(resolveAlert.pending, setLoading);
    builder.addCase(resolveAlert.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(resolveAlert.rejected, (state, { error }) => {
      state.loading = false;
      state.error = error as string;
    });
  },
});

const alertState = (state: RootState) => state.alert;

export const alertSelector = createDraftSafeSelector(
  alertState,
  (state) => state
);

export const { setAlertRule } = alertSlice.actions;

export const alertReducer = alertSlice.reducer;
