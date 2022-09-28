import React, { FC } from 'react';
import { TextField } from '@mui/material';
import { SelectSeverity } from './SelectSeverity';
import * as yup from 'yup';
import { AlertSeverity } from '../api/generated';
import { AlertRuleDialogStep, AlertRuleDialogStepBase } from './AlertRuleDialogStep';

export interface AlertRuleDialogStep1Values {
  name: string;
  alert_severity?: AlertSeverity;
}

export type AlertRuleDialogStep1 = AlertRuleDialogStepBase<AlertRuleDialogStep1Values>;

const validationSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  alert_severity: yup.string().required('Severity is required')
});

export const AlertRuleDialogStep1: FC<AlertRuleDialogStep1> = props => (
  <AlertRuleDialogStep<AlertRuleDialogStep1Values> {...props} validationSchema={validationSchema}>
    {({ getFieldProps }) => (
      <>
        <TextField label="Alert name" variant="outlined" {...getFieldProps('name')} sx={{ mb: '40px' }} />
        <SelectSeverity label="Alert severity" {...getFieldProps('alert_severity')} />
      </>
    )}
  </AlertRuleDialogStep>
);
