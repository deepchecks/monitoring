import {
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from "@reduxjs/toolkit";
import axios from "axios";
import AlertService from "../../../services/AlertSective";
import ModelService from "../../../services/ModelSecrive";
import { ID } from "../../../types";
import { AlertsCount } from "../../../types/alert";
import { AllDataIngestion, Model, ModelColumns } from "../../../types/model";
import { RootState } from "../../store";
import { InitialStateType } from "./modelTypes";

export const initialState: InitialStateType = {
  allDataIngestion: {} as AllDataIngestion,
  allModels: [],
  columns: {} as ModelColumns,
  model: {} as Model,
  error: "",
  loading: false,
};

export const getModels = createAsyncThunk("model/getModels", async () => {
  try {
    const response = await ModelService.getModels();
    const models = axios.all(
      response.data.map(async (model) => {
        const res = await AlertService.getAlertsCountById(model.id);
        const count = Object.keys(res.data).reduce(
          (acc, key) => acc + res.data[key as keyof AlertsCount],
          0
        );
        return { ...model, count };
      })
    );
    return models;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(err.message);
    }

    throw new Error("Error");
  }
});

export const getColumns = createAsyncThunk(
  "model/getColumns",
  async (modelId: ID) => {
    try {
      const response = await ModelService.getColums(modelId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message);
      }

      throw new Error("Error");
    }
  }
);

export const getAllDataIntestion = createAsyncThunk(
  "model/getAllDataIntestion",
  async (_, { rejectWithValue }) => {
    try {
      const response = await ModelService.getAllDataIntestion();
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

export const modelSlice = createSlice({
  name: "model",
  initialState,
  reducers: {
    clearColumns: (state) => {
      state.columns = {} as ModelColumns;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getModels.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getModels.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.allModels = payload;
    });
    builder.addCase(getModels.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getColumns.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getColumns.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.columns = payload;
    });
    builder.addCase(getColumns.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(getAllDataIntestion.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getAllDataIntestion.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.allDataIngestion = payload;
    });
    builder.addCase(getAllDataIntestion.rejected, (state) => {
      state.loading = false;
    });
  },
});

const modelState = (state: RootState) => state.model;

export const modelSelector = createDraftSafeSelector(
  modelState,
  (state) => state
);

export const { clearColumns } = modelSlice.actions;

export const modelReducer = modelSlice.reducer;
