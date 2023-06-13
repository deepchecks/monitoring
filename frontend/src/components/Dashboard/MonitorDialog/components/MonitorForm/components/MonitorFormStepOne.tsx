import React from 'react';

import { MonitorSchema } from 'api/generated';

import useModels from 'helpers/hooks/useModels';

import { MenuItem } from '@mui/material';

import { BaseInput, BaseDropdown } from 'components/base/InputDropdown/InputDropdown';

import { SelectValues } from 'helpers/types';
import { constants } from '../../../monitorDialog.constants';

const { modelLabel, monitorNameLabel } = constants.monitorForm;

interface MonitorFormStepOneProps {
  monitorName: string;
  setMonitorName: (value: React.SetStateAction<string>) => void;
  monitor: MonitorSchema | null;
  model: SelectValues;
  setModel: (value: React.SetStateAction<SelectValues>) => void;
  resetForm: () => void;
}

export const MonitorFormStepOne = ({
  monitorName,
  setMonitorName,
  monitor,
  model,
  setModel,
  resetForm
}: MonitorFormStepOneProps) => {
  const { models: modelsList } = useModels();

  return (
    <>
      <BaseInput
        label={monitorNameLabel}
        value={monitorName}
        onChange={event => setMonitorName(event.target.value)}
        required={!monitor}
        sx={{ marginTop: '-15px' }}
      />
      <BaseDropdown
        label={modelLabel}
        value={model}
        onChange={event => {
          setModel(event.target.value as string);
          resetForm();
        }}
        clearValue={() => {
          setModel('');
          resetForm();
        }}
        disabled={!!monitor}
        required
      >
        {modelsList.map(({ name, id }) => (
          <MenuItem key={id} value={id}>
            {name}
          </MenuItem>
        ))}
      </BaseDropdown>
    </>
  );
};
