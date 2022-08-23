import { SelectChangeEvent } from "@mui/material";
import { useState } from "react";

export const useSelector = (
  initState: string
): [
  string,
  (event: SelectChangeEvent<unknown>) => void,
  (state: string) => void
] => {
  const [value, setValue] = useState(initState);

  const handleValueChange = (event: SelectChangeEvent<unknown>) => {
    setValue(event.target.value as string);
  };

  return [value, handleValueChange, setValue];
};
