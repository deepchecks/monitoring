import React from 'react';

import { Box } from '@mui/material';

import { StyledButton } from '../AlertRuleDialog.styles';

import { AlertRuleStepBaseProps } from '../AlertRuleDialog.type';
import { constants } from '../alertRuleDialog.constants';

const {
  buttons: { back, next }
} = constants;

interface AlertRuleDialogButtonsProps extends AlertRuleStepBaseProps {
  disabled: boolean;
}

export const AlertRuleDialogButtons = ({
  activeStep,
  handleBack,
  handleNext,
  disabled
}: AlertRuleDialogButtonsProps) => (
  <Box marginTop="50px" marginLeft="auto">
    {activeStep !== 0 && (
      <StyledButton
        sx={{ color: theme => theme.palette.text.disabled, marginRight: '20px' }}
        onClick={handleBack}
        variant="text"
      >
        {back}
      </StyledButton>
    )}
    <StyledButton onClick={handleNext} disabled={disabled}>
      {next(activeStep === 2)}
    </StyledButton>
  </Box>
);
