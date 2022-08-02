export const setError = <
  T extends { loading: boolean; error: string },
  K extends { payload: string }
>(
  state: T,
  action: K
) => {
  state.loading = false;
  state.error = action.payload;
};

export const setLoading = <T extends { loading: boolean; error: string }>(
  state: T
) => {
  state.loading = true;
  state.error = "";
};
