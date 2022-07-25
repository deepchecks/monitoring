import { InputAdornment, TextFieldProps } from "@mui/material";
import { memo } from "react";
import { SearchIcon } from "../../assets/icon/icon";
import { StyledTextField } from "./SearchField.style";

function SearchFieldComponent(props: TextFieldProps) {
  return (
    <StyledTextField
      placeholder="Search Model"
      variant="outlined"
      {...props}
      InputProps={{
        endAdornment: (
          <InputAdornment
            position="end"
            sx={{
              cursor: "pointer",
            }}
          >
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
}

export const SearchField = memo(SearchFieldComponent);
