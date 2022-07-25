import { Box, styled, Typography } from "@mui/material";

interface StyledBoxWrapperProps {
  bgColor: string;
}

export const StyledBoxWrapper = styled(Box)<StyledBoxWrapperProps>(
  ({ bgColor }) => ({
    background: bgColor,
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    textAlign: "center",
    cursor: "pointer",
    padding: "10px 14px 10px 10px",
  })
);

export const StyledTypographyTitle = styled(Typography)({
  fontSize: "24px",
  color: "#fff",
  fontWeight: 600,
  margin: "0 9px",
});

export const StyledTypographyMessage = styled(Typography)({
  fontSize: "14px",
  color: "#fff",
});
