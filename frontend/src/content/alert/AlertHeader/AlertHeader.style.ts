import { Box, styled } from "@mui/material";

export const StyledBoxWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: "15px 40px",
  justifyContent: "space-between",
  backgroundColor: theme.palette.grey[100],
}));

export const StyledFlexWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
});
