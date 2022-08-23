import { InputLabel, Select, styled } from "@mui/material";

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled,
}));

export const StyledSelect = styled(Select)({
  minWidth: 200,
  "& .MuiSvgIcon-root": {
    display: "none",
  },
});
