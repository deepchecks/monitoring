import { FormControl, InputLabel, styled } from "@mui/material";

export const StyledFormControl = styled(FormControl)({
  minWidth: 160,
});

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled,
}));
