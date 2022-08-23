import { Box, List, styled } from "@mui/material";

export const StyledAlertContainer = styled(Box)(({ theme }) => ({
  padding: "40px 40px 0",
  width: "100%",
  [theme.breakpoints.down(1381)]: {
    marginLeft: "83px",
  },
}));

export const StyledList = styled(List)({
  padding: 0,
  marginTop: "40px",
});

export const StyledListItem = styled(List)({
  padding: 0,
  margin: "20px 0",
  ":first-of-type": {
    marginTop: 0,
  },
  ":last-of-type": {
    marginBottom: 0,
  },
});
