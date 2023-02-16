import { Box, Button, Stack, TextField } from '@mui/material';
import { AlertSeverity } from 'api/generated';
import { SelectSeverity } from 'components/SelectSeverity';
import React, { useContext, useEffect, useState } from 'react';
import { AlertRuleStepBaseProps } from './AlertRuleDialogContent';
import { AlertRuleDialogContext } from './AlertRuleDialogContext';

export const AlertRuleDialogStepOne = ({ handleNext }: AlertRuleStepBaseProps) => {
  const { alertRule, setAlertRule, monitor, setMonitor } = useContext(AlertRuleDialogContext);
  const [name, setName] = useState<string>(monitor.name);
  const [severity, setSeverity] = useState<AlertSeverity | undefined>(alertRule.alert_severity);

  const finish = () => {
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
    <Box
      component="form"
      sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', mt: 5, mb: 5 }}
    >
      <Box sx={{ maxWidth: 400, width: '100%' }}>
        <Stack spacing={5}>
          <TextField
            sx={{ flex: '0 1 100%' }}
            required
            label="Alert rule name"
            size="medium"
            value={name}
            onChange={event => setName(event.target.value)}
          />
          <SelectSeverity
            sx={{ flex: '0 1 100%' }}
            onChange={event => {
              setSeverity(event.target.value as AlertSeverity);
            }}
            size="medium"
            value={severity}
          />
        </Stack>
        <Box sx={{ textAlign: 'end', mt: '60px' }}>
          <Button onClick={finish} sx={{ mr: 0 }} disabled={!name || !severity}>
            {'Next'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
