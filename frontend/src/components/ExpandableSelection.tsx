import { Box, Button, MenuItem, Popover, SelectChangeEvent, SelectProps, styled, TextField } from '@mui/material';
import { StaticDateTimePicker } from '@mui/x-date-pickers';
import { AnalysisContext } from 'Context/AnalysisContext';
import dayjs from 'dayjs';
import React, { useContext, useRef, useState } from 'react';
import { colors } from 'theme/colors';
import { MarkedSelect } from './MarkedSelect';

interface ExpandableSelectionProps extends SelectProps {
  data: { label: string; value: number }[];
  changeState: (state: number) => void;
  label: string;
  endTime: number | undefined;
}

const StyledStaticDateTimePicker = styled(StaticDateTimePicker)(({ theme }) => ({
  '& .MuiPickersFadeTransitionGroup-root': {
    fontSize: 12
  },
  '& .MuiTypography-caption': {
    fontSize: 12,
    color: theme.palette.text.disabled,
    lineHeight: '17px'
  },
  '& .MuiButtonBase-root': {
    fontSize: 12,
    lineHeight: '17px'
  },
  '& .MuiButtonBase-root.MuiPickersDay-root:hover': {
    backgroundColor: theme.palette.primary.contrastText
  },
  '& .MuiDialogActions-root': {
    display: 'none'
  },
  '& .MuiPickersCalendarHeader-root .MuiButtonBase-root ': {
    background: 'transparent',
    '& svg': {
      color: colors.neutral.blue
    }
  },
  '& .MuiClock-root': {
    '& .MuiButtonBase-root': {
      borderRadius: '50%',

      '.MuiTypography-root': {
        color: theme.palette.common.white
      },

      '&:disabled': {
        color: theme.palette.text.disabled
      }
    }
  }
})) as typeof StaticDateTimePicker;

const today = new Date();

export function ExpandableSelection({ label, changeState, data, endTime, ...props }: ExpandableSelectionProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [date, setDate] = useState<Date | null>(today);
  const { setPeriod } = useContext(AnalysisContext);

  const selectRef = useRef<HTMLDivElement>();
  const openDatePicker = Boolean(anchorEl);

  const handleDatePickerOpen = () => {
    if (selectRef.current) {
      setAnchorEl(selectRef.current);
    }
  };

  const handleDatePickerClose = () => {
    setAnchorEl(null);
  };

  const handleDateChange = (newDate: Date | null) => {
    setDate(newDate);
  };

  const handleLookbackChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as number;
    changeState(value);
    const time = endTime ? endTime * 1000 : Date.now();
    if (value) {
      setPeriod([new Date(time - value), new Date(time)]);
    }
  };

  const onApply = () => {
    if (date) {
      const numericDateFormat = +new Date(date);
      data.push({
        label: dayjs.duration(numericDateFormat - +today).humanize(true),
        value: numericDateFormat
      });
      setAnchorEl(null);
      changeState(numericDateFormat);
    }
  };

  return (
    <>
      <Box ref={selectRef} sx={{ width: 'max-content' }}>
        <MarkedSelect size="small" onChange={handleLookbackChange} {...props} label={label} sx={{ minWidth: 330 }}>
          {data.map(({ label, value }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
          <MenuItem value={0} onClick={handleDatePickerOpen}>
            Custom
          </MenuItem>
        </MarkedSelect>
      </Box>

      <Popover
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        open={openDatePicker}
        onClose={handleDatePickerClose}
      >
        <Box sx={{ position: 'relative' }}>
          <StyledStaticDateTimePicker
            value={date}
            hideTabs={false}
            onChange={handleDateChange}
            renderInput={params => <TextField {...params} sx={{ fontSize: 12 }} />}
            showToolbar={false}
            inputFormat="DD MMM YYYY"
          />
        </Box>
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
    </>
  );
}
