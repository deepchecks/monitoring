import { Box, styled } from "@mui/material";

export const StyledDashboardContainer = styled(Box)(({ theme }) => ({
  padding: "20px",
  paddingBottom: "40px",
  marginLeft: "250px",
  width: "100%",
  minWidth: "1094px",
  [theme.breakpoints.down(1381)]: {
    marginLeft: "83px",
  },
}));

export const StyledFlexContainer = styled(Box)(() => ({
  display: "flex",
  flexWrap: "wrap",
  gap: "15px",
  justifyContent: "space-between",
}));

export const StyledFlexContent = styled(Box)(({ theme }) => ({
  maxWidth: "512px",
  width: "100%",
  minWidth: "428px",
  minHeight: "446px",
  borderLeft: "8px solid #F1E9FE",
  boxShadow: "0px 0px 25px 2px rgba(0, 0, 0, 0.09)",
  borderRadius: "10px",
  marginBottom: "40px",
  [theme.breakpoints.down(1944)]: {
    maxWidth: "32%",
  },
  [theme.breakpoints.down(1635)]: {
    maxWidth: "47%",
  },
  "&.fourth": {
    maxWidth: "47%",
  },
  "&.fifth": {
    maxWidth: "47%",
    [theme.breakpoints.down(1635)]: {
      maxWidth: "100% ",
    },
  },
  "&.second": {
    borderWidth: "0px 0px 8px 8px",
    borderStyle: "solid",
    borderColor: "#F1E9FE",
  },
  "&.sixs": {
    maxWidth: "100%!important",
  },
  "&.sevn": {
    maxWidth: "100%!important",
  },
}));
