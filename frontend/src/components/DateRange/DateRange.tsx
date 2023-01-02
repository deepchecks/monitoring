import React from 'react';
import { DateRangePicker, RangeKeyDict, Range } from 'react-date-range';
import 'react-date-range/dist/theme/default.css';
import 'react-date-range/dist/styles.css';
import dayjs from 'dayjs';
import { Box, Button, Popover, styled, TextField } from '@mui/material';
import { Calendar } from 'assets/icon/icon';

interface DateRangeProps {
    onChange: (startTime: Date | undefined, endTime: Date | undefined) => void;
    startTime?: Date;
    endTime?: Date;
  }

export const DateRange = ({ onChange, startTime, endTime=new Date() } : DateRangeProps) => {
    const initialRange : Range = {
        startDate: startTime ? startTime : dayjs(endTime).subtract(1, 'month').toDate(),
        endDate: endTime,
        key: 'selection'
      }
    const [range, setRange] = React.useState<Range>(initialRange);
    const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);

    React.useEffect(() => {
        setRange({
            startDate: startTime ? startTime : dayjs(endTime).subtract(1, 'month').toDate(),
            endDate: endTime,
            key: 'selection'
        })
    }, [startTime, endTime])
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
        onChange(range.startDate, range.endDate);
    };

    const handleSelect = (selectedRange: RangeKeyDict) => {
        setRange(selectedRange['selection']);
      };

    return (
        <Box ref={selectRef}>

            <StyledTextField 
                variant="outlined" 
                label="Time Range"
                value={ `${dayjs(range.startDate).format('MM/DD/YYYY')} - ${dayjs(range.endDate).format('MM/DD/YYYY')}` } 
                size="small"
                sx={{ cursor: 'pointer', width: '260px'}}
                InputProps={{
                    endAdornment: <Button onClick={handleDatePickerOpen} variant='text' sx={{minWidth: '24px', pl:'5px'}}><Calendar /></Button>,
                    readOnly: true
                }}>
            </StyledTextField>
            <Popover
                anchorEl={anchorEl}
                anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                open={openDatePicker}
                onClose={handleDatePickerClose}
            >
                <DateRangePicker
                    ranges={[range]}
                    onChange={handleSelect} />
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
    )
}

const StyledTextField = styled(TextField)({
      '.MuiOutlinedInput-input': {
        cursor: 'pointer'
      }
})
  