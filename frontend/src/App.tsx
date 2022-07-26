import { CssBaseline, ThemeProvider } from "@mui/material";
import "./App.css";
import { theme } from "./helpers/theme";
import MyRouts from "./routes";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MyRouts />
    </ThemeProvider>
  );
}

export default App;
