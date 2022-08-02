import { Box, styled } from "@mui/material";

export const StyledBoxWrapper = styled(Box)(({ theme }) => ({
  padding: "10px",
  backgroundColor: theme.palette.grey[50],
}));

export const StyledGraphWrapper = styled(Box)({
  padding: "70px",
  width: 690,
});
