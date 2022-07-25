import { Box, styled } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { BACKGROUND_COLOR_MAX_WIDTH } from "../helpers/colors/color";
import { privateRoutes, publicRoutes } from "../helpers/routes";

const StyledContainer = styled(Box)(({ theme }) => ({
  maxWidth: "1920px",
  minWidth: "1280px",
  position: "relative",
  margin: "0 auto",
  background: BACKGROUND_COLOR_MAX_WIDTH,
  [theme.breakpoints.up(1920)]: {
    borderRight: "1px solid rgba(209, 216, 220, 0.5)",
    borderLeft: "1px solid rgba(209, 216, 220, 0.5)",
    height: "100%",
  },
}));

const StyledFlexWrapper = styled(Box)({
  display: "flex",
  height: "100%",
});

const isAuth = true;

export default function MyRouts() {
  return (
    <StyledContainer>
      <StyledFlexWrapper>
        <Sidebar />
        <Routes>
          {isAuth
            ? privateRoutes.map(({ Component, path }) => (
                <Route key={path} path={path} element={<Component />} />
              ))
            : publicRoutes.map(({ Component, path }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
          {/* <Route path="*" element={<Navigate to="/dashboard" />} /> */}
        </Routes>
      </StyledFlexWrapper>
    </StyledContainer>
  );
}
