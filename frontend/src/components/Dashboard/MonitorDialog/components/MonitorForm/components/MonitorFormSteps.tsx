import React from 'react';

import { StepLabel, Stepper, Step, Box } from '@mui/material';

import { constants } from '../../../monitorDialog.constants';

interface MonitorFormStepsProps {
  activeStep: number;
}

const { basicInfo, monitorData } = constants.monitorForm.steps;
const STEPS = [basicInfo, monitorData];

export const MonitorFormSteps = ({ activeStep }: MonitorFormStepsProps) => (
  <Box
    sx={theme => ({
      position: 'sticky',
      top: 0,
      zIndex: 999,
      width: 1,
      padding: '15px 0',
      backgroundColor: theme.palette.common.white
    })}
  >
    <Stepper activeStep={activeStep} sx={{ width: '300px', marginX: 'auto' }}>
      {STEPS.map(label => (
        <Step key={label}>
          <StepLabel color="inherit">{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  </Box>
);
