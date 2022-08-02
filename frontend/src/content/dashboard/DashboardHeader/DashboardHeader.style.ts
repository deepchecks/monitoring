import { Box, Button, styled, Typography } from "@mui/material";

export const StyledBoxWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  padding: "20px 48px 20px 0",
  justifyContent: "space-between",
});

export const StyledFlexWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const StyledTypographyHome = styled(Typography)({
  fontSize: "20px",
  lineHeight: "133.4%",
  color: "#94A4AD",
  marginLeft: "9px",
});

export const StyledTypographyAdd = styled(Typography)({
  color: "#9D60FB",
  fontSize: "14px",
  fontWeight: 400,
  marginLeft: "4px",
});

export const StyledDivider = styled(Box)({
  backgroundColor: "#B3BEC4",
  margin: "0 20px 0 30px",
  height: "42px",
  width: "1px",
});

export const StyledButton = styled(Button)({
  textTransform: "none",
  padding: "8px",
});
