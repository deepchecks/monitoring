import React from 'react';
import { DesktopDatePicker } from '@mui/x-date-pickers';
import { Calendar } from '../../../assets/icon/icon';
import { DesktopDatePickerStyle, InputStyle } from './DatePicker.style';

// TODO - This Implementation relevant to @mui/x-date-pickers version ^5.0.0-beta.7, need to be replaced with the new one
export function DatePicker({ ...props }: any) {
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
