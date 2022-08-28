import { alpha, Box, ListItem, styled, Typography } from "@mui/material";
import { Link } from "react-router-dom";

interface StyledContainerProps {
  isBorder?: boolean;
}

export const StyledContainer = styled(ListItem)({
  padding: 0,
});

export const StyledLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "isBorder",
})<StyledContainerProps>(({ isBorder = false, theme }) => {
  const style = isBorder
    ? {
        border: `1px dashed ${theme.palette.text.disabled}`,
        borderRight: "none",
      }
    : {};
  return {
    textDecoration: "none",
    padding: "21px 30px",
    cursor: "pointer",
    color: "inherit",
    width: "100%",
    ":hover": {
      backgroundColor: theme.palette.grey[100],
    },
    ...style,
  };
});

export const StyledModelInfo = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
});

export const StyledTypographyDate = styled(Typography)({
  marginTop: "4px",
});

export const StyledAlert = styled(Box)(({ theme }) => ({
  width: 50,
  height: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: alpha(theme.palette.error.main, 0.1),
  borderRadius: "20px",
}));

export const StyledCounter = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
}));
