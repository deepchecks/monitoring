import { Box, styled, TextField } from "@mui/material";

export const StyledInputWrapper = styled(Box)({
  display: "flex",
  justifyContent: "end",
});

export const StyledTextField = styled(TextField)({
  "& .MuiOutlinedInput-input": {
    padding: "4px 12px",
    width: 60,
  },
});
