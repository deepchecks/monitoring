import { Box, styled } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { privateRoutes, publicRoutes } from "../helpers/routes";

const StyledContainer = styled(Box)(({ theme }) => ({
  minWidth: "1280px",
  position: "relative",
  margin: "0 auto",
  background:
    "linear-gradient(180deg, #F3F5F8 0%, #FFFFFF 29.64%, #FFFFFF 100%)",
  [theme.breakpoints.up(1920)]: {
    borderRight: "1px solid rgba(209, 216, 220, 0.5)",
    borderLeft: "1px solid rgba(209, 216, 220, 0.5)",
    height: "100%",
  },
}));

const StyledContent = styled(Box)({
  marginLeft: "237px",
  width: "100%",
});

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
        <StyledContent>
          <Routes>
            {isAuth
              ? privateRoutes.map(({ Component, path }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))
              : publicRoutes.map(({ Component, path }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </StyledContent>
      </StyledFlexWrapper>
    </StyledContainer>
  );
}
