import { alpha, Box, styled, Typography } from "@mui/material";

interface StyledCriticalityProps {
  bgColor: string;
}

export const StyledBoxWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "bgColor",
})<StyledCriticalityProps>(({ bgColor }) => ({
  display: "flex",
  alignItems: "center",
  textAlign: "center",
  cursor: "pointer",
  padding: "6px 17px 6px 7px",
  borderRadius: "1000px",
  border: `1px solid ${alpha(bgColor, 0.4)}`,
}));

interface StyledStackProps {
  textColor: string;
}

export const StyledValueWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "textColor",
})<StyledStackProps>(({ textColor }) => ({
  marginLeft: "9px",
  color: textColor,
}));

export const StyledTypographyMessage = styled(Typography)({
  fontSize: 10,
  lineHeight: "12px",
  letterSpacing: "0.4px",
});

export const StyledCriticality = styled(Box, {
  shouldForwardProp: (prop) => prop !== "bgColor",
})<StyledCriticalityProps>(({ bgColor }) => ({
  height: 38,
  width: 38,
  backgroundColor: bgColor,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
}));
