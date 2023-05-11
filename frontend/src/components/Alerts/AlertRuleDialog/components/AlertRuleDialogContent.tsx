import React, { forwardRef } from 'react';

import { Box, StepLabel, Stepper } from '@mui/material';

import { AlertRuleDialogStepOne } from './RuleDialogStepOne';
import { AlertRuleDialogStepThree } from './RuleDialogStepThree';
import { AlertRuleDialogStepTwo } from './RuleDialogStepTwo';

import { StyledStepContainer, StyledStep } from '../AlertRuleDialog.styles';

interface AlertRuleDialogContentProps {
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
  steps: any[];
  setNextButtonDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertRuleDialogContent = forwardRef(
  ({ activeStep, steps, setNextButtonDisabled }: AlertRuleDialogContentProps, ref) => {
    const renderStep = () => {
      const renderStepProps = {
        setNextButtonDisabled,
        ref
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
  }
);

AlertRuleDialogContent.displayName = 'AlertRuleDialogContent';
