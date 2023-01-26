import { Box, Step, StepLabel, Stepper, styled } from '@mui/material';
import React from 'react';
import { AlertRuleDialogStepOne } from './RuleDialogStepOne';
import { AlertRuleDialogStepThree } from './RuleDialogStepThree';
import { AlertRuleDialogStepTwo } from './RuleDialogStepTwo';

const steps = ['Basic Info', 'Monitor Data', 'Rule'];

interface AlertRuleDialogContentProps {
  handleComplete: () => void;
  startingStep?: number;
}

export interface AlertRuleStepBaseProps {
  handleNext: () => void;
  handleBack?: () => void;
}

export const AlertRuleDialogContent = ({ handleComplete, startingStep }: AlertRuleDialogContentProps) => {
  const [activeStep, setActiveStep] = React.useState(startingStep ? startingStep : 0);

  const handleNext = () => {
    activeStep === steps.length - 1 ? handleComplete() : setActiveStep(activeStep + 1);
  };

  const handleBack = () => setActiveStep(prevActiveStep => prevActiveStep - 1);

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return <AlertRuleDialogStepOne handleNext={handleNext} />;
      case 1:
        return <AlertRuleDialogStepTwo handleNext={handleNext} handleBack={handleBack} />;
      case 2:
        return <AlertRuleDialogStepThree handleNext={handleNext} handleBack={handleBack} />;
      default:
        return null;
    }
  };
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1200px',
        ml: 'auto',
        mr: 'auto',
        justifyContent: 'start',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '90vh'
      }}
    >
      <Stepper activeStep={activeStep} sx={{ width: '440px' }}>
        {steps.map(label => (
          <StyledStep key={label}>
            <StepLabel color="inherit">{label}</StepLabel>
          </StyledStep>
        ))}
      </Stepper>
      <>
        <Box sx={{ pt: 2, width: '100%' }}>
          <Box>{renderStep()}</Box>
        </Box>
      </>
    </Box>
  );
};

const StyledStep = styled(Step)({
  '& .MuiStepIcon-root': {
    color: '#3A474E' // circle color
  },
  '& .MuiStepLabel-root .Mui-active': {
    color: '#9D60FB' // circle color (ACTIVE)
  },
  '& .MuiStepLabel-root .Mui-completed': {
    color: '#3A474E' // circle color (COMPLETED)
  },
  '& .MuiStepLabel-root .MuiStepIcon-text': {
    fill: '#ffffff',
    fontSize: '14px' // circle's number
  }
});
