import { InputLabel, Select, styled } from "@mui/material";

export const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.disabled,
}));

export const StyledSelect = styled(Select)(({ theme }) => ({
  minWidth: 200,
  "& .MuiSvgIcon-root": {
    display: "none",
  },
  "&.Mui-focused": {
    color: theme.palette.primary.main,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: `${theme.palette.primary.main} !important`,
  },
}));
