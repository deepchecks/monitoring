import { CssBaseline, ThemeProvider } from "@mui/material";
import { Provider } from "react-redux";
import "./App.css";
import { theme } from "./helpers/theme";
import MyRouts from "./routes";
import { store } from "./store/store";

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MyRouts />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
