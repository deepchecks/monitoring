import { createAsyncThunk } from "@reduxjs/toolkit";
import CheckService from "../../services/CheckService";
import { ID } from "../../types";
import { Check, RunCheckRequest } from "../../types/check";

export const getChecks = createAsyncThunk(
  "check/getChecks",
  async (modelId: ID, { rejectWithValue }) => {
    try {
      const response = await CheckService.getChecks(modelId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

interface RunCheckOptions {
  checkId: ID;
  data: RunCheckRequest;
}

export const runCheck = createAsyncThunk(
  "check/runCheck",
  async ({ checkId, data }: RunCheckOptions, { rejectWithValue }) => {
    try {
      const response = await CheckService.runCheck(checkId, data);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

interface CreateCheckOptions {
  modelId: ID;
  data: Check;
}

export const createCheck = createAsyncThunk(
  "check/createCheck",
  async ({ modelId, data }: CreateCheckOptions, { rejectWithValue }) => {
    try {
      const response = await CheckService.createChecks(modelId, data);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);
