export const setLoading = (state: { loading: boolean; error: string }) => {
  state.loading = true;
  state.error = "";
};
