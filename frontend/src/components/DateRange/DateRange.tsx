import React from 'react';
import { DateRangePicker, RangeKeyDict, Range } from 'react-date-range';
import 'react-date-range/dist/theme/default.css';
import 'react-date-range/dist/styles.css';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { Box, Button, Popover, styled, TextField } from '@mui/material';
import { Calendar } from 'assets/icon/icon';

dayjs.extend(localizedFormat);

interface DateRangeProps {
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
  const initialRange: Range = {
    startDate: startTime,
    endDate: endTime,
    key: 'selection'
  };
  const [range, setRange] = React.useState<Range>(initialRange);
  const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setRange({
      startDate: startTime,
      endDate: endTime,
      key: 'selection'
    });
  }, [startTime, endTime]);
  const selectRef = React.useRef<HTMLDivElement>();
  const openDatePicker = Boolean(anchorEl);

  const handleDatePickerOpen = () => {
    if (selectRef.current) {
      setAnchorEl(selectRef.current);
    }
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
      <StyledTextField
        onClick={handleDatePickerOpen}
        variant="outlined"
        label="Time Range"
        value={`${dayjs(range.startDate).format('L')} - ${dayjs(range.endDate).format('L')}`}
        size="small"
        sx={{ cursor: 'pointer', width: { xs: '205px', xl: '260px' } }}
        InputProps={{
          endAdornment: (
            <Button variant="text" sx={{ minWidth: '24px', pl: '5px' }}>
              <Calendar />
            </Button>
          ),
          readOnly: true,
          sx: {
            fontSize: '16px',
            '@media (max-width: 1536px)': {
              fontSize: '12px'
            }
          }
        }}
      ></StyledTextField>
      <Popover
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        open={openDatePicker}
        onClose={handleDatePickerClose}
      >
        <DateRangePicker maxDate={maxDate} minDate={minDate} ranges={[range]} onChange={handleSelect} />
        <Box
          sx={{
            padding: '20px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderTop: theme => `1px solid ${theme.palette.grey[200]}`
          }}
        >
          <Button variant="text" onClick={onApply}>
            Apply
          </Button>
        </Box>
      </Popover>
    </Box>
  );
};

const StyledTextField = styled(TextField)({
  '.MuiOutlinedInput-input': {
    cursor: 'pointer'
  }
});
