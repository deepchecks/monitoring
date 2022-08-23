export const setLoading = (state: { loading: boolean; error: string }) => {
  state.loading = false;
  state.error = "";
};
