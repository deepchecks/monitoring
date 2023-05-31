import React, { useState, useEffect, useRef } from 'react';
import { DateRangePicker, RangeKeyDict, Range } from 'react-date-range';
import 'react-date-range/dist/theme/default.css';
import 'react-date-range/dist/styles.css';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { Box, Button, Popover } from '@mui/material';

import { DropdownTextField } from 'components/base/Input/DropdownTextField';

import { StyledButtonContainer } from './DateRange.style';

dayjs.extend(localizedFormat);

export interface DateRangeProps {
  onApply?: (startTime: Date | undefined, endTime: Date | undefined) => void;
  onChange?: (startTime: Date | undefined, endTime: Date | undefined) => void;
  startTime?: Date;
  endTime?: Date;
  maxDate?: Date;
  minDate?: Date;
}

export const DateRange = ({
  onApply: callOnApply,
  onChange: callOnChange,
  startTime,
  endTime,
  maxDate,
  minDate
}: DateRangeProps) => {
  const [range, setRange] = useState<Range>({
    startDate: startTime,
    endDate: endTime,
    key: 'selection'
  });
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const selectRef = useRef<HTMLDivElement>();
  const openDatePicker = Boolean(anchorEl);

  useEffect(() => {
    setRange({
      startDate: startTime,
      endDate: endTime,
      key: 'selection'
    });
  }, [startTime, endTime]);

  const handleDatePickerOpen = () => {
    if (selectRef.current) setAnchorEl(selectRef.current);
  };

  const handleDatePickerClose = () => {
    setAnchorEl(null);
  };

  const onApply = () => {
    setAnchorEl(null);
    if (callOnApply) callOnApply(range.startDate, range.endDate);
  };

  const handleSelect = (selectedRange: RangeKeyDict) => {
    setRange(selectedRange['selection']);
    if (callOnChange) callOnChange(selectedRange['selection'].startDate, selectedRange['selection'].endDate);
  };

  return (
    <Box ref={selectRef}>
      <DropdownTextField
        onClick={handleDatePickerOpen}
        value={`${dayjs(range.startDate).format('L')} - ${dayjs(range.endDate).format('L')}`}
        isDropdownOpen={!!anchorEl}
        sx={{ width: '233px' }}
      />
      <Popover
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        open={openDatePicker}
        onClose={handleDatePickerClose}
      >
        <DateRangePicker maxDate={maxDate} minDate={minDate} ranges={[range]} onChange={handleSelect} />
        <StyledButtonContainer>
          <Button variant="text" onClick={onApply}>
            Apply
          </Button>
        </StyledButtonContainer>
      </Popover>
    </Box>
  );
};
