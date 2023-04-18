import React, { useState, useRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';

import { Box, Popover } from '@mui/material';

import { DropdownArrowComponent } from './DropdownArrowComponent';
import { StyledButtonContainer, StyledTextField, StyledButton } from './DateTimePicker.styles';

import { convertDate } from './DateTimePicker.utils';

interface DateTimePickerProps {
  value: string | null;
  setValue: React.Dispatch<React.SetStateAction<string | null>>;
  maxDate?: Date;
  minDate?: Date;
  dateTime?: boolean;
}

export const DateTimePicker = (props: DateTimePickerProps) => {
  const { value, setValue } = props;

  const [tempValue, setTempValue] = useState<Dayjs | null>(dayjs(value));
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const selectRef = useRef<HTMLDivElement>();
  const openDatePicker = Boolean(anchorEl);

  const openDateTimePicker = () => {
    if (selectRef?.current) setAnchorEl(selectRef.current);
  };

  const closeDateTimePicker = () => {
    setAnchorEl(null);
    setTempValue(dayjs(value));
  };

  const onApply = () => {
    setAnchorEl(null);
    setValue(convertDate(tempValue));
  };

  return (
    <Box ref={selectRef}>
      <StyledTextField
        variant="outlined"
        size="small"
        onClick={openDateTimePicker}
        value={value}
        InputProps={{
          endAdornment: <DropdownArrowComponent isDropdownOpen={!!anchorEl} />,
          readOnly: true
        }}
      />
      <Popover
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        open={openDatePicker}
        onClose={closeDateTimePicker}
      >
        <StyledButtonContainer>
          <StyledButton variant="text" onClick={onApply}>
            Apply
          </StyledButton>
        </StyledButtonContainer>
      </Popover>
    </Box>
  );
};
