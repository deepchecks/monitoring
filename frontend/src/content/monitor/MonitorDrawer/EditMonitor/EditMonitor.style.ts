import { Box, Button, Stack, styled, Typography } from "@mui/material";

export const StyledStackContainer = styled(Stack)({
  padding: "62px 40px 47px",
  height: "100%",
  justifyContent: "space-between",
});

export const StyledStackInputs = styled(Stack)({
  width: 320,
});

export const StyledTypography = styled(Typography)({
  textAlign: "center",
  marginBottom: "65px",
});

export const StyledButtonWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const StyledButton = styled(Button)({
  width: 166,
});
