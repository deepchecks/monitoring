import { Box, Button, styled, Typography } from "@mui/material";

export const StyledFlexContent = styled(Box)(() => ({
  width: "100%",
  minWidth: "428px",
  minHeight: "446px",
  boxShadow: "0px 0px 25px 2px rgba(0, 0, 0, 0.09)",
  borderRadius: "10px",
  marginBottom: "40px",
  borderLeft: "8px solid rgba(239, 76, 54, 0.5)",
  height: "100%",
}));

export const StyledTypographyTitle = styled(Typography)({
  color: "#3A474E",
  fontWeight: 500,
  fontSize: 18,
  lineHeight: "160%",
  textAlign: "left",
  paddingTop: "16px",
  paddingLeft: "12px",
  paddingBottom: "21px",
});

export const StyledButton = styled(Button)({
  padding: "8px",
  marginLeft: "30px",
});

export const StyledWrapper = styled(Box)({
  padding: "20px 30px 20px 22px",
});
