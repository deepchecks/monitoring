import { useEffect } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import "./App.css";
import { theme } from "./helpers/theme";
import MyRouts from "./routes";
import { instance } from "./requests/requests";

function App() {
  useEffect(() => {
    instance
      .get("/api/v1/say-hello")
      .then((response: any) => console.log(response.data))
      .catch((err: any) => console.log(err));
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MyRouts />
    </ThemeProvider>
  );
}

export default App;
