import React, { useMemo, useEffect, useState } from 'react';

import { SelectChangeEvent, MenuItem } from '@mui/material';

import { StyledRoundedSelectContainer, StyledRoundedSelect, StyledMostWorstButton } from './AnalysisItemSelect.style';
import { AnalysisItemSelectProps } from './AnalysisItemSelect.types';
import { TypeMap } from 'helpers/utils/checkUtil';

const PER_FEATURE = 'none';

const SingleSelect = ({
  size = 'small',
  label,
  data,
  type,
  isMostWorstActive,
  filteredValues,
  isDriftCheck,
  setFilteredValues,
  setIsMostWorstActive,
  checkParams
}: AnalysisItemSelectProps) => {
  const paramValue = useMemo(() => checkParams[TypeMap[type]], [checkParams, type]);

  const [value, setValue] = useState((paramValue !== PER_FEATURE && paramValue) || PER_FEATURE);

  const handleSetSelectValue = (value: string) => {
    setIsMostWorstActive(value ? false : !isMostWorstActive);

    setValue(value);

    const newFilteredValues = { ...filteredValues };

    newFilteredValues[type] = [value];
    setFilteredValues(newFilteredValues);
  };

  const handleSelectValueChange = (event: SelectChangeEvent<unknown>) => {
    const { value } = event.target;
    value === PER_FEATURE ? clearSelectedValue() : handleSetSelectValue(value as string);
  };

  const handleMostDriftedClick = () => {
    if (isMostWorstActive) {
      clearSelectedValue();
      setIsMostWorstActive(false);
      return;
    }

    setIsMostWorstActive(true);
    clearSelectedValue();
  };

  const clearSelectedValue = () => {
    setValue(PER_FEATURE);

    const newFilteredValues = { ...filteredValues };

    newFilteredValues[type] = null;
    setFilteredValues(newFilteredValues);
  };

  useEffect(() => {
    const val = filteredValues[type];
    val === null ? setValue(PER_FEATURE) : val && setValue(val[0]);
  }, [filteredValues, type]);

  return (
    <>
      <StyledRoundedSelectContainer fullWidth>
        <StyledRoundedSelect size={size} label={label} labelId={label} value={value} onChange={handleSelectValueChange}>
          <MenuItem value={PER_FEATURE}>Per feature</MenuItem>
          {data
            ?.filter(({ name }) => name !== PER_FEATURE)
            .map(({ name }) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
        </StyledRoundedSelect>
      </StyledRoundedSelectContainer>
      <StyledMostWorstButton active={isMostWorstActive} onClick={handleMostDriftedClick}>
        {isDriftCheck ? 'Most Drifted' : 'Highest Values'}
      </StyledMostWorstButton>
    </>
  );
};

export default SingleSelect;
