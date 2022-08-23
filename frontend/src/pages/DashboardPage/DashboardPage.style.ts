import { Box, styled } from "@mui/material";

export const StyledDashboardContainer = styled(Box)(({ theme }) => ({
  padding: "0 40px",
  paddingBottom: "40px",
  width: "100%",
  [theme.breakpoints.down(1381)]: {
    marginLeft: "83px",
  },
}));
