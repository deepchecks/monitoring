import React, { useContext, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

import { AlertSeverity, Frequency } from 'api/generated';

import { MenuItem, Stack, TextField } from '@mui/material';

import { SelectSeverity } from 'components/Select/SelectSeverity';
import { MarkedSelect } from 'components/base/MarkedSelect';
import { StyledContentContainer } from '../AlertRuleDialog.styles';
import { AlertRuleDialogContext } from '../AlertRuleDialogContext';
import { AlertRuleStepBaseProps } from '../AlertRuleDialog.type';
import { constants } from '../alertRuleDialog.constants';

import { SelectValues } from 'helpers/types';
import { FrequencyMap, FrequencyNumberMap, FrequencyNumberType } from 'helpers/utils/frequency';
import { freqTimeWindow } from 'helpers/base/monitorFields.helpers';
import useModels from 'helpers/hooks/useModels';

const {
  frequency: { label: frequencyLabel }
} = constants.stepTwo;

const DATA_TYPES = ['Samples', 'Labels', 'Missing Labels'];

export const DataRuleDialogStepOne = forwardRef(({ setNextButtonDisabled }: AlertRuleStepBaseProps, ref) => {
  const { alertRule, setAlertRule, monitor, setMonitor } = useContext(AlertRuleDialogContext);
  const { models: modelsList } = useModels();

  const [name, setName] = useState(monitor.name);
  const [model, setModel] = useState<SelectValues>(monitor?.check.model_id || '');
  const [severity, setSeverity] = useState<AlertSeverity | undefined>(alertRule.alert_severity);
  const [dataType, setDataType] = useState(DATA_TYPES[0]);
  const [frequency, setFrequency] = useState<SelectValues>(
    FrequencyMap[monitor?.frequency as Frequency] ?? freqTimeWindow[0].value
  );

  const finish = () => {
    if (name && severity && model) {
      monitor.name = name;
      alertRule.alert_severity = severity;
      monitor.check.model_id = +model;
      // monitor.check.data_type = +dataType;
      monitor.frequency = FrequencyNumberMap[frequency as FrequencyNumberType['type']];

      setMonitor(monitor);
      setAlertRule(alertRule);
    }
  };

  useImperativeHandle(ref, () => ({
    next() {
      finish();
    }
  }));

  useEffect(() => {
    setNextButtonDisabled(!name || !severity || !model);
  }, [name, severity, model]);

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
          onChange={event => setSeverity(event.target.value as AlertSeverity)}
          size="medium"
          value={severity}
        />
        <MarkedSelect
          size="medium"
          label="Model"
          value={model}
          onChange={event => setModel(event.target.value as string)}
          clearValue={() => setModel('')}
          disabled={!!alertRule.id}
        >
          {modelsList.map(({ name, id }) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
        </MarkedSelect>
        <MarkedSelect
          size="medium"
          label="Data Type"
          value={dataType}
          onChange={event => setDataType(event.target.value as string)}
        >
          {DATA_TYPES.map((val: string) => (
            <MenuItem key={val} value={val}>
              {val} #
            </MenuItem>
          ))}
        </MarkedSelect>
        <MarkedSelect
          label={frequencyLabel}
          value={frequency}
          onChange={event => setFrequency(event.target.value as number)}
          fullWidth
          size="medium"
        >
          {freqTimeWindow.map(({ label, value }, index) => (
            <MenuItem key={value + index} value={value}>
              {label}
            </MenuItem>
          ))}
        </MarkedSelect>
      </Stack>
    </StyledContentContainer>
  );
});

DataRuleDialogStepOne.displayName = 'DataRuleDialogStepOne';
