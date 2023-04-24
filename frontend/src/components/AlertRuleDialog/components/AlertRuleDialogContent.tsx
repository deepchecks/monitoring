import React, { useState } from 'react';

import { Box, StepLabel, Stepper } from '@mui/material';

import { AlertRuleDialogStepOne } from './RuleDialogStepOne';
import { AlertRuleDialogStepThree } from './RuleDialogStepThree';
import { AlertRuleDialogStepTwo } from './RuleDialogStepTwo';

import { StyledStepContainer, StyledStep } from '../AlertRuleDialog.styles';

const steps = ['Basic Info', 'Monitor Data', 'Rule'];

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
    <StyledStepContainer>
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
    </StyledStepContainer>
  );
};
