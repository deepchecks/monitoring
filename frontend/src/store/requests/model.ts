import { createAsyncThunk } from "@reduxjs/toolkit";
import ModelService from "../../services/ModelSecrive";

export const getModels = createAsyncThunk(
  "model/getModels",
  async (_, { rejectWithValue }) => {
    try {
      const response = await ModelService.getModels();
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

export const getColumns = createAsyncThunk(
  "model/getColumns",
  async (modelId: number | string, { rejectWithValue }) => {
    try {
      const response = await ModelService.getColums(modelId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);
