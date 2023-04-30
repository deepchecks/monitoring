import React, { useEffect, useState } from 'react';
import { Slider as MUISlider, SliderProps as MUISliderProps, styled } from '@mui/material';

const StyledSlider = styled(MUISlider)(({ theme }) => ({
  color: theme.palette.primary.main,
  height: 2,
  '& .MuiSlider-rail': {
    height: '4px'
  },
  '& .MuiSlider-thumb': {
    height: 12,
    width: 12
  },
  '& .MuiSlider-valueLabel': {
    backgroundColor: theme.palette.primary.main,
    borderRadius: '6px',
    fontSize: '10px',
    lineHeight: '14px'
  }
}));

export interface SliderProps extends MUISliderProps {
  state: number | number[];
  setState: (state: any) => void;
}

export const Slider = (props: SliderProps) => {
  const { state, setState, ...otherProps } = props;

  const [value, setValue] = useState<number | number[]>(state);

  const handleChange = (_event: Event, newValue: number | number[]) => {
    setValue(newValue as number | number[]);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => setState(value), [value]);

  return <StyledSlider value={value} onChange={handleChange} valueLabelDisplay="auto" {...otherProps} />;
};
