import React, { useContext, useEffect, useState } from 'react';

import { AlertSeverity } from 'api/generated';

import { AlertRuleStepBaseProps } from './AlertRuleDialogContent';
import { AlertRuleDialogContext } from './AlertRuleDialogContext';

import { Stack, TextField } from '@mui/material';

import { SelectSeverity } from 'components/SelectSeverity';

import { StyledContentContainer } from './AlertRuleDialog.styles';
import { AlertRuleDialogButtons } from './AlertRuleDialogButtons';

export const AlertRuleDialogStepOne = ({ activeStep, handleNext }: AlertRuleStepBaseProps) => {
  const { alertRule, setAlertRule, monitor, setMonitor } = useContext(AlertRuleDialogContext);

  const [name, setName] = useState(monitor.name);
  const [severity, setSeverity] = useState<AlertSeverity | undefined>(alertRule.alert_severity);

  const nextStep = () => {
    if (name && severity) {
      // Setting the context values
      monitor.name = name;
      setMonitor(monitor);
      alertRule.alert_severity = severity;
      setAlertRule(alertRule);

      handleNext();
    }
  };

  useEffect(() => {
    setName(monitor.name);
    setSeverity(alertRule.alert_severity as AlertSeverity);
  }, [monitor.name, alertRule.alert_severity]);

  return (
    <StyledContentContainer>
      <Stack spacing={2} width={1}>
        <TextField
          required
          label="Alert rule name"
          size="medium"
          value={name}
          onChange={event => setName(event.target.value)}
        />
        <SelectSeverity
          onChange={event => {
            setSeverity(event.target.value as AlertSeverity);
          }}
          size="medium"
          value={severity}
        />
      </Stack>
      <AlertRuleDialogButtons disabled={!name || !severity} activeStep={activeStep} handleNext={nextStep} />
    </StyledContentContainer>
  );
};
