import {
  createAsyncThunk,
  createDraftSafeSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { ChartData } from "chart.js";
import dayjs from "dayjs";
import { setGraphColor } from "../../../helpers/lineDataChangeFunction";
import ModelService from "../../../services/ModelSecrive";
import { ID } from "../../../types";
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
    return response.data;
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

export const getAllDataIngestion = createAsyncThunk(
  "model/getAllDataIntestion",
  async (timeFilter: number, { rejectWithValue }) => {
    try {
      const response = await ModelService.getAllDataIntestion(timeFilter);
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
    builder.addCase(getAllDataIngestion.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(getAllDataIngestion.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.allDataIngestion = payload;
    });
    builder.addCase(getAllDataIngestion.rejected, (state) => {
      state.loading = false;
    });
  },
});

const modelState = (state: RootState) => state.model;

export const modelSelector = createDraftSafeSelector(
  modelState,
  (state) => state
);

export const modelGraphSelector = createDraftSafeSelector(
  modelState,
  (state): ChartData<"line", any> => {
    if (!Object.keys(state.allDataIngestion).length) {
      return {
        datasets: [],
      };
    }

    return {
      datasets: Object.entries(state.allDataIngestion).map(
        ([key, item], index) => ({
          data: item.map(({ count, day }) => ({
            x: dayjs(new Date(day)).format("MMM. DD (HH:mm:ss)"),
            y: count,
          })),
          ...setGraphColor(key, index),
        })
      ),
    };
  }
);

export const { clearColumns } = modelSlice.actions;

export const modelReducer = modelSlice.reducer;
