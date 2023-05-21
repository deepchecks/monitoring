import React, { useContext, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

import { AlertSeverity } from 'api/generated';

import { AlertRuleDialogContext } from '../AlertRuleDialogContext';

import { Stack, TextField } from '@mui/material';

import { SelectSeverity } from 'components/Select/SelectSeverity';

import { StyledContentContainer } from '../AlertRuleDialog.styles';
import { AlertRuleStepBaseProps } from '../AlertRuleDialog.type';
import { constants } from '../alertRuleDialog.constants';

export const AlertRuleDialogStepOne = forwardRef(({ setNextButtonDisabled }: AlertRuleStepBaseProps, ref) => {
  const { alertRule, setAlertRule, monitor, setMonitor } = useContext(AlertRuleDialogContext);

  const [name, setName] = useState(monitor.name);
  const [severity, setSeverity] = useState<AlertSeverity | undefined>(alertRule.alert_severity);

  const finish = () => {
    if (name && severity) {
      // Setting the context values
      monitor.name = name;
      setMonitor(monitor);
      alertRule.alert_severity = severity;
      setAlertRule(alertRule);
    }
  };

  useImperativeHandle(ref, () => ({
    next() {
      finish();
    }
  }));

  useEffect(() => {
    setNextButtonDisabled(!name || !severity);
  }, [name, severity]);

  useEffect(() => {
    setName(monitor.name);
    setSeverity(alertRule.alert_severity as AlertSeverity);
  }, [monitor.name, alertRule.alert_severity]);

  return (
    <StyledContentContainer>
      <Stack spacing={2} width={1}>
        <TextField
          required
          label={constants.stepOne.nameLabel}
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
    </StyledContentContainer>
  );
});

AlertRuleDialogStepOne.displayName = 'AlertRuleDialogStepOne';
