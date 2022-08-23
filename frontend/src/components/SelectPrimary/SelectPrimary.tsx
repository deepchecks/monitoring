import { Select, SelectProps } from "@mui/material";
import { ReactNode } from "react";
import { StyledFormControl, StyledInputLabel } from "./SelectPrimary.style";

interface SelectPrimaryProps extends SelectProps {
  children: ReactNode;
  label: string;
  fullWidth?: boolean;
}

const sizeMap = {
  small: "small",
  medium: "normal",
} as const;

export function SelectPrimary({
  children,
  label,
  fullWidth = false,
  size,
  ...props
}: SelectPrimaryProps) {
  return (
    <StyledFormControl fullWidth={fullWidth}>
      <StyledInputLabel size={size ? sizeMap[size] : sizeMap.medium}>
        {label}
      </StyledInputLabel>
      <Select size={size} label={label} {...props}>
        {children}
      </Select>
    </StyledFormControl>
  );
}
