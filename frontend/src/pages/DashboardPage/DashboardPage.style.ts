import { Box, styled } from "@mui/material";

export const StyledDashboardContainer = styled(Box)(({ theme }) => ({
  padding: "0 40px",
  paddingBottom: "40px",
  marginLeft: "237px",
  width: "100%",
  minWidth: "1094px",
  [theme.breakpoints.down(1381)]: {
    marginLeft: "83px",
  },
}));
