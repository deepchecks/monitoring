import React from 'react';
import { Slider as MUISlider, SliderProps as MUISliderProps, styled } from '@mui/material';

const StyledSlider = styled(MUISlider)(({ theme }) => ({
  color: theme.palette.primary.main,

  '& .MuiSlider-valueLabel': {
    backgroundColor: theme.palette.primary.main,
    borderRadius: '6px'
  }
}));

const StyledSBaseSlider = styled(StyledSlider)({
  height: 2,

  '& .MuiSlider-rail': {
    height: '4px'
  },

  '& .MuiSlider-thumb': {
    height: 12,
    width: 12
  },

  '& .MuiSlider-valueLabel': {
    fontSize: '10px',
    lineHeight: '14px'
  }
});

interface StyledStepSliderProps {
  visibleOnly?: boolean;
}

const StyledStepSlider = styled(StyledSlider, {
  shouldForwardProp: prop => prop !== 'visibleOnly'
})<StyledStepSliderProps>(({ theme, visibleOnly }) => ({
  pointerEvents: visibleOnly ? 'none' : 'all',
  height: 16,

  '& .MuiSlider-rail': {
    height: '16px',
    background: theme.palette.grey[200]
  },

  '& .MuiSlider-thumb': {
    height: 30,
    width: 30
  },

  '& .MuiSlider-mark': {
    height: 16,
    color: theme.palette.common.white
  },

  '& .MuiSlider-mark:nth-of-type(3), .MuiSlider-mark:nth-last-of-type(3)': {
    opacity: 0
  },

  '& .MuiSlider-markLabel': {
    fontSize: '13px',
    fontWeight: 700,
    color: theme.palette.grey[400],
    opacity: 0.7,
    marginTop: '10px'
  },

  '& .MuiSlider-markLabelActive': {
    opacity: 1
  }
}));

export interface SliderProps extends MUISliderProps {
  value: number | number[];
  setValue: (state: any) => void;
}

export const Slider = (props: SliderProps) => {
  const { value, setValue, ...otherProps } = props;

  const handleChange = (_event: Event, newValue: number | number[]) => {
    setValue(newValue as number | number[]);
  };

  return <StyledSBaseSlider value={value} onChange={handleChange} valueLabelDisplay="auto" {...otherProps} />;
};

interface StepSliderProps extends SliderProps {
  visibleOnly?: boolean;
}

export const StepSlider = (props: StepSliderProps) => {
  const { value, setValue, visibleOnly, ...otherProps } = props;

  const handleChange = (_event: Event, newValue: number | number[]) => {
    setValue(newValue as number | number[]);
  };

  return (
    <StyledStepSlider
      value={value}
      onChange={handleChange}
      valueLabelDisplay="auto"
      visibleOnly={visibleOnly}
      {...otherProps}
    />
  );
};
