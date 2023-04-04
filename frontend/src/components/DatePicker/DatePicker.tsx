import React from 'react';
import { DesktopDatePicker, DesktopDatePickerProps } from '@mui/x-date-pickers';
import { Calendar } from '../../assets/icon/icon';
import { DesktopDatePickerStyle, InputStyle } from './DatePicker.style';

export function DatePicker({ ...props }: DesktopDatePickerProps<Date, Date>) {
  return (
    <DesktopDatePicker
      components={{
        OpenPickerIcon: Calendar
      }}
      PopperProps={{
        sx: DesktopDatePickerStyle
      }}
      InputProps={{
        sx: InputStyle
      }}
      {...props}
    />
  );
}
