import { createSlice } from "@reduxjs/toolkit";

interface InitialState {
  [key: string | number]: [] | boolean;
}
const initialStates: InitialState = {
  loading: false,
};
const slice = createSlice({
  name: "chart",
  initialState: initialStates,
  reducers: {},
  extraReducers: {},
});

export default slice.reducer;
