import { Box, styled, Typography } from "@mui/material";

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

export const StyledTypographyTitle = styled(Typography)({
  color: "#3A474E",
  fontWeight: 500,
  fontSize: 18,
  lineHeight: "160%",
  textAlign: "left",
  marginTop: "16px",
  marginLeft: "16px",
  marginBottom: "11px",
});
