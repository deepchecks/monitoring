import { Slider, SliderProps, Stack } from '@mui/material';
import { memo } from 'react';

import { Box, styled, TextField } from '@mui/material';

export const StyledInputWrapper = styled(Box)({
  display: 'flex',
  justifyContent: 'end'
});

export const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-input': {
    padding: '4px 12px',
    width: 60
  }
});

interface RangePickerProps extends SliderProps {
  handleInputBlur: () => void;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function RangePickerComponent({ handleInputBlur, handleInputChange, ...props }: RangePickerProps) {
  return (
    <Stack spacing="20px">
      <Slider {...props} />
      <StyledInputWrapper>
        <StyledTextField
          onChange={handleInputChange}
          value={props.value || ''}
          type="number"
          onBlur={handleInputBlur}
          placeholder="0"
          InputLabelProps={{
            shrink: true
          }}
        />
      </StyledInputWrapper>
    </Stack>
  );
}

export const RangePicker = memo(RangePickerComponent);
