import { Slider, SliderProps, Stack } from "@mui/material";
import { memo } from "react";
import { StyledInputWrapper, StyledTextField } from "./RangePicker.style";

interface RangePickerProps extends SliderProps {
  handleInputBlur: () => void;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function RangePickerComponent({
  handleInputBlur,
  handleInputChange,
  ...props
}: RangePickerProps) {
  return (
    <Stack spacing="20px">
      <Slider {...props} />
      <StyledInputWrapper>
        <StyledTextField
          onChange={handleInputChange}
          value={props.value || ""}
          type="number"
          onBlur={handleInputBlur}
          placeholder="0"
          InputLabelProps={{
            shrink: true,
          }}
        />
      </StyledInputWrapper>
    </Stack>
  );
}

export const RangePicker = memo(RangePickerComponent);
