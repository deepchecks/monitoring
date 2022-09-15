import { Box } from '@mui/material';
import React, { FC } from 'react';
import * as yup from 'yup';
import { DataFilter, ModelSchema } from '../api/generated';
import { AlertRuleDialogStep, AlertRuleDialogStepBase } from './AlertRuleDialogStep';
import { SelectModelColumn } from './SelectModelColumn';

export type AlertRuleDialogStep3Values = DataFilter;

export interface AlertRuleDialogStep3 extends AlertRuleDialogStepBase<AlertRuleDialogStep3Values> {
  modelId: ModelSchema['id'];
}

const validationSchema = yup.object().shape({
  value: yup.mixed().when('column', {
    is: (column: AlertRuleDialogStep3Values['column']) => !!column,
    then: yup.mixed().required('Value is required')
  })
});

export const AlertRuleDialogStep3: FC<AlertRuleDialogStep3> = ({ modelId, ...props }) => (
  <AlertRuleDialogStep<AlertRuleDialogStep3Values> {...props} validationSchema={validationSchema}>
    {({ getFieldProps, setFieldValue }) => (
      <Box>
        <SelectModelColumn
          modelId={modelId}
          label="Select Column"
          {...getFieldProps('column')}
          valueProps={getFieldProps('value')}
          setFieldValue={setFieldValue}
        />
      </Box>
    )}
  </AlertRuleDialogStep>
);
