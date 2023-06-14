import React from 'react';

import { MonitorSchema } from 'api/generated';

import { MenuItem } from '@mui/material';

import { SelectCheck } from 'components/Select/SelectCheck';
import { SelectColumn } from 'components/Select/SelectColumn';
import { TooltipInputWrapper } from 'components/TooltipInputWrapper';
import { BaseDropdown } from 'components/base/InputDropdown/InputDropdown';
import { MonitorFormAdvancedSection } from './MonitorFormAdvancedSection';

import { freqTimeWindow } from 'helpers/base/monitorFields.helpers';
import { SelectValues, SetStateType } from 'helpers/types';
import { FilteredValues } from 'helpers/utils/checkUtil';
import { constants } from '../../../monitorDialog.constants';

const { frequencyLabel, frequencyTooltip } = constants.monitorForm;

interface MonitorFormStepTwoProps {
  monitor: MonitorSchema | null;
  model: SelectValues;
  check: SelectValues;
  setCheck: SetStateType<SelectValues>;
  filteredValues: FilteredValues;
  setFilteredValues: SetStateType<FilteredValues>;
  resConf: string | undefined;
  setResConf: SetStateType<string | undefined>;
  setIsValidConfig: SetStateType<boolean>;
  column: string | undefined;
  setColumn: SetStateType<string | undefined>;
  category: SelectValues;
  setCategory: SetStateType<SelectValues>;
  numericValue: number[] | undefined;
  setNumericValue: SetStateType<number[] | undefined>;
  frequency: SelectValues;
  setFrequency: (value: React.SetStateAction<SelectValues>) => void;
  aggregationWindow: number;
  setAggregationWindow: (value: React.SetStateAction<number>) => void;
}

export const MonitorFormStepTwo = ({
  monitor,
  model,
  check,
  setCheck,
  filteredValues,
  setFilteredValues,
  resConf,
  setResConf,
  setIsValidConfig,
  column,
  setColumn,
  category,
  setCategory,
  numericValue,
  setNumericValue,
  frequency,
  setFrequency,
  aggregationWindow,
  setAggregationWindow
}: MonitorFormStepTwoProps) => {
  return (
    <>
      <SelectCheck
        monitor={monitor}
        model={model}
        check={check}
        setCheck={setCheck}
        filteredValues={filteredValues}
        setFilteredValues={setFilteredValues}
        resConf={resConf}
        setResConf={setResConf}
        setIsValidConfig={setIsValidConfig}
        disabled={!!monitor || !model}
        sx={{ marginTop: '15px !important' }}
      />
      <SelectColumn
        model={model}
        column={column}
        setColumn={setColumn}
        category={category}
        setCategory={setCategory}
        numericValue={numericValue}
        setNumericValue={setNumericValue}
      />
      <TooltipInputWrapper title={frequencyTooltip}>
        <BaseDropdown
          label={frequencyLabel}
          value={frequency}
          required
          onChange={event => setFrequency(event.target.value as string)}
          clearValue={() => {
            setFrequency(freqTimeWindow[0].value);
            setAggregationWindow(1);
          }}
        >
          {freqTimeWindow.map(({ label, value }, index) => (
            <MenuItem key={value + index} value={value}>
              {label}
            </MenuItem>
          ))}
        </BaseDropdown>
      </TooltipInputWrapper>
      <MonitorFormAdvancedSection
        aggregationWindow={aggregationWindow}
        setAggregationWindow={setAggregationWindow}
        frequency={frequency}
      />
    </>
  );
};
