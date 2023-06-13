import React, { useEffect, useCallback } from 'react';

import { MonitorSchema } from 'api/generated';

import { MenuItem } from '@mui/material';

import {
  ControlledBaseDropdown,
  ControlledBaseDropdownDisabledCallback
} from 'components/base/InputDropdown/ControlledBaseDropdown';
import { SelectCheck } from 'components/Select/SelectCheck';
import { SelectColumn } from 'components/Select/SelectColumn';
import { TooltipInputWrapper } from 'components/TooltipInputWrapper';
import { Subcategory } from 'components/Subcategory';
import { BaseInput, BaseDropdown } from 'components/base/InputDropdown/InputDropdown';

import { StyledDivider, StyledLink } from '../MonitorForm.style';

import { freqTimeWindow, lookbackTimeWindow } from 'helpers/base/monitorFields.helpers';
import { SelectValues, SetStateType } from 'helpers/types';
import { FilteredValues } from 'helpers/utils/checkUtil';
import { FrequencyNumberMap, FrequencyNumberType } from 'helpers/utils/frequency';
import { constants } from '../../../monitorDialog.constants';

const {
  aggWindowLabel,
  displayRangeLabel,
  displayRangeTooltip,
  frequencyLabel,
  frequencyTooltip,
  aggWindowError,
  resetToDefault,
  advancedStr,
  aggValueStr
} = constants.monitorForm;

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
  advanced: boolean;
  setAdvanced: (value: React.SetStateAction<boolean>) => void;
  lookBack: SelectValues;
  setLookBack: SetStateType<SelectValues>;
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
  setAggregationWindow,
  advanced,
  setAdvanced,
  lookBack,
  setLookBack
}: MonitorFormStepTwoProps) => {
  const aggregationWindowErr = aggregationWindow > 30;
  const aggregationWindowSuffix = `${FrequencyNumberMap[frequency as FrequencyNumberType['type']].toLowerCase()}${
    aggregationWindow > 1 ? 's' : ''
  }`;

  const isDisabledLookback = useCallback(
    (lookbackSelect: { label: string; value: number }) => {
      if (frequency === undefined) return false;
      if (lookbackSelect.value < +frequency) return true;
      if (lookbackSelect.value > +frequency * 31) return true;
      return false;
    },
    [frequency]
  );

  useEffect(() => {
    const filteredLookbacks = lookbackTimeWindow.filter(val => !isDisabledLookback(val)).map(val => val.value);
    if (lookBack && !filteredLookbacks.includes(+lookBack)) {
      setLookBack(filteredLookbacks.at(-1));
    }
  }, [frequency]);

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
      <StyledDivider />
      <SelectColumn
        model={model}
        column={column}
        setColumn={setColumn}
        category={category}
        setCategory={setCategory}
        numericValue={numericValue}
        setNumericValue={setNumericValue}
      />
      <StyledDivider />
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
      {!advanced ? (
        <StyledLink underline="hover" onClick={() => setAdvanced(true)}>
          {advancedStr}
        </StyledLink>
      ) : (
        <Subcategory sx={{ marginTop: '0 !important' }}>
          <BaseInput
            placeholder={aggWindowLabel}
            value={aggregationWindow}
            label={aggValueStr}
            onChange={event => setAggregationWindow(Number(event.target.value))}
            error={aggregationWindowErr}
            helperText={aggregationWindowErr ? aggWindowError : ''}
            inputProps={{ min: 0, max: 30 }}
            InputProps={{ endAdornment: aggregationWindowSuffix }}
            type="number"
            fullWidth
          />
          <StyledLink
            underline="hover"
            onClick={() => {
              setAdvanced(false);
              setAggregationWindow(1);
            }}
          >
            {resetToDefault}
          </StyledLink>
        </Subcategory>
      )}
      <TooltipInputWrapper title={displayRangeTooltip}>
        <ControlledBaseDropdown
          label={displayRangeLabel}
          values={lookbackTimeWindow}
          value={lookBack}
          setValue={setLookBack}
          clearValue={() => setLookBack('')}
          DisabledCallback={isDisabledLookback as ControlledBaseDropdownDisabledCallback}
          required
        />
      </TooltipInputWrapper>
    </>
  );
};
