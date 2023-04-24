import React, { useState } from 'react';

import { Box, Step, StepLabel, Stepper, styled } from '@mui/material';

import { AlertRuleDialogStepOne } from './RuleDialogStepOne';
import { AlertRuleDialogStepThree } from './RuleDialogStepThree';
import { AlertRuleDialogStepTwo } from './RuleDialogStepTwo';

const steps = ['Basic Info', 'Monitor Data', 'Rule'];

export interface AlertRuleStepBaseProps {
  activeStep: number;
  handleNext: () => void;
  handleBack?: () => void;
}

interface AlertRuleDialogContentProps {
  handleComplete: () => void;
  startingStep?: number;
}

export const AlertRuleDialogContent = ({ handleComplete, startingStep }: AlertRuleDialogContentProps) => {
  const [activeStep, setActiveStep] = useState(startingStep || 0);

  const handleNext = () => {
    activeStep === steps.length - 1 ? handleComplete() : setActiveStep(prevActiveStep => prevActiveStep + 1);
  };

  const handleBack = () => setActiveStep(prevActiveStep => prevActiveStep - 1);

  const renderStep = () => {
    const renderStepProps = {
      activeStep,
      handleNext,
      handleBack
    };

    switch (activeStep) {
      case 0:
        return <AlertRuleDialogStepOne {...renderStepProps} />;
      case 1:
        return <AlertRuleDialogStepTwo {...renderStepProps} />;
      case 2:
        return <AlertRuleDialogStepThree {...renderStepProps} />;
      default:
        return null;
    }
  };

  return (
    <StyledContainer>
      <Stepper activeStep={activeStep} sx={{ width: '476px' }}>
        {steps.map(label => (
          <StyledStep key={label}>
            <StepLabel color="inherit">{label}</StepLabel>
          </StyledStep>
        ))}
      </Stepper>
      <Box component="form" sx={{ marginTop: '50px', width: 1 }}>
        {renderStep()}
      </Box>
    </StyledContainer>
  );
};

const StyledContainer = styled(Box)({
  marginTop: '38px',
  justifyContent: 'start',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
});

const StyledStep = styled(Step)(({ theme }) => ({
  '& .MuiStepIcon-root': {
    color: theme.palette.grey.light
  },

  '& .MuiStepLabel-root': {
    color: theme.palette.primary.main,

    '& .Mui-active': {
      color: theme.palette.primary.main,

      '& .MuiStepIcon-text': {
        fill: theme.palette.common.white
      }
    },

    '& .Mui-completed': {
      color: theme.palette.grey.light
    },

    '& .MuiStepIcon-text': {
      fill: theme.palette.text.disabled,
      fontSize: '14px',
      fontWeight: 600
    }
  },

  '& .MuiStepLabel-label': {
    color: theme.palette.text.disabled,
    fontWeight: 600
  }
}));
