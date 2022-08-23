import { Box, Divider, styled } from "@mui/material";
import { DesktopDatePicker } from "@mui/x-date-pickers";

export const StyledMainWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const StyledDesktopDatePicker = styled(DesktopDatePicker)({
  background: "#000",
});

export const StyledDateWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: 353,
});

export const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: "0 18px",
  borderColor: theme.palette.grey[200],
}));
