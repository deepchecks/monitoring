import React, { FC, useState } from 'react';
import * as yup from 'yup';
import { ModelManagmentSchema, useGetChecksApiV1ModelsModelIdChecksGet, CheckSchema, DataFilter } from '../api/generated';
import { AlertRuleDialogStep, AlertRuleDialogStepBase, AlertRuleDialogStepRenderArgs } from './AlertRuleDialogStep';
import { SelectPrimary, SelectPrimaryItem } from './SelectPrimary/SelectPrimary';
import { CircularProgress } from '@mui/material';
import { SelectModelColumn } from './SelectModelColumn';
import { SelectFrequency } from './SelectFrequency';

type ModelId = CheckSchema['model_id'];

export interface AlertRuleDialogStep2Values {
  check_id?: CheckSchema['id'];
  model_id?: ModelId;
  data_filter?: DataFilter;
  frequency?: number;
  aggregation_window?: number;
}

export interface AlertRuleDialogStep2 extends AlertRuleDialogStepBase<AlertRuleDialogStep2Values> {
  models: ModelManagmentSchema[];
}

const validationSchema = yup.object().shape({
  model_id: yup.number().min(1, 'Model is required'),
  check_id: yup.number().min(1, 'Check is required')
});

export const AlertRuleDialogStep2: FC<AlertRuleDialogStep2> = ({ models, ...props }) => {
  const [modelId, setModelId] = useState<ModelId>(props.initialValues.model_id || 0);
  const { data: checks = [], isLoading: isChecksLoading } = useGetChecksApiV1ModelsModelIdChecksGet(modelId);

  const onModelIdBuilder =
    (setFieldValue: AlertRuleDialogStepRenderArgs<AlertRuleDialogStep2Values>['setFieldValue']) => (modelId: any) => {
      setModelId(modelId || 0);
      setFieldValue('check_id', 0);
      setFieldValue('data_filters', null);
    };

  return (
    <AlertRuleDialogStep<AlertRuleDialogStep2Values> {...props} validationSchema={validationSchema}>
      {({ getFieldProps, setFieldValue, isEdit }) => (
        <>
          <SelectPrimary
            disabled={isEdit}
            label="Select Model"
            name="model_id"
            {...getFieldProps('model_id', onModelIdBuilder(setFieldValue))}
          >
            {models.map(({ id, name }) => (
              <SelectPrimaryItem value={id} key={id}>
                {name}
              </SelectPrimaryItem>
            ))}
          </SelectPrimary>

          <SelectPrimary
            label="Select Check"
            name="check_id"
            disabled={isEdit || isChecksLoading}
            {...getFieldProps('check_id')}
            {...(isChecksLoading && modelId && { IconComponent: CircularProgress })}
          >
            {checks.map(({ id, name }) => (
              <SelectPrimaryItem value={id} key={id}>
                {name}
              </SelectPrimaryItem>
            ))}
          </SelectPrimary>
          <SelectFrequency
            frequency={getFieldProps('frequency').value as number}
            aggregation_window={getFieldProps('aggregation_window').value as number}
            setFieldValue={setFieldValue}
          />

          <SelectModelColumn
            modelId={modelId}
            label="Select Column"
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            {...getFieldProps('data_filter.column')}
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            valueProps={getFieldProps('data_filter.value')}
            setFieldValue={setFieldValue}
          />
        </>
      )}
    </AlertRuleDialogStep>
  );
};
