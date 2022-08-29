import { CssBaseline, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";
import "./App.css";
import { theme } from "./helpers/theme";
import MyRouts from "./routes";
import { store } from "./store/store";

function App() {
  return (
    <Provider store={store}>
      <HashRouter>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <CssBaseline />
            <MyRouts />
          </LocalizationProvider>
        </ThemeProvider>
      </HashRouter>
    </Provider>
  );
}

export default App;
