import { createAsyncThunk } from "@reduxjs/toolkit";
import MonitorService from "../../services/MonitorService";
import { ID } from "../../types";
import { Monitor } from "../../types/monitor";

interface GetModelsOptions {
  checkId: ID;
  monitor: Monitor;
}

export const getMonitor = createAsyncThunk(
  "monitor/getMonitor",
  async (monitorId: ID, { rejectWithValue }) => {
    try {
      const response = await MonitorService.getMonitor(monitorId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

export const createMonitor = createAsyncThunk(
  "monitor/createMonitor",
  async ({ checkId, monitor }: GetModelsOptions, { rejectWithValue }) => {
    try {
      const response = await MonitorService.createMonitor(checkId, monitor);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

export const updateMonitor = createAsyncThunk(
  "monitor/updateMonitor",
  async ({ checkId, monitor }: GetModelsOptions, { rejectWithValue }) => {
    try {
      const response = await MonitorService.updateMonitor(checkId, monitor);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);

export const deleteMonitor = createAsyncThunk(
  "monitor/deleteMonitor",
  async (monitorId: ID, { rejectWithValue }) => {
    try {
      const response = await MonitorService.deleteMonitor(monitorId);
      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }

      return rejectWithValue(err);
    }
  }
);
