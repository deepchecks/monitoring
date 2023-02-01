import React, { useMemo, useEffect, useState } from 'react';

import { SelectChangeEvent, MenuItem } from '@mui/material';

import InputLabel from './components/InputLabel';
import ClearButton from './components/ClearButton';

import { StyledRoundedSelectContainer, StyledRoundedSelect, StyledMostWorstButton } from './AnalysisItemSelect.style';
import { AnalysisItemSelectProps } from './AnalysisItemSelect.types';
import { TypeMap } from 'components/AnalysisItem/AnalysisItem.types';

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

  const [value, setValue] = useState(paramValue || '');

  const handleSetSelectValue = (value: string) => {
    setIsMostWorstActive(value ? false : !isMostWorstActive);

    setValue(value);

    const newFilteredValues = { ...filteredValues };

    newFilteredValues[type] = [value];
    setFilteredValues(newFilteredValues);
  };

  const handleSelectValueChange = (event: SelectChangeEvent<unknown>) => {
    const { value } = event.target;
    handleSetSelectValue(value as string);
  };

  const handleMostDriftedClick = () => {
    if (isMostWorstActive) {
      handleClearSelectedValue();
      setIsMostWorstActive(false);
      return;
    }

    setIsMostWorstActive(true);
    handleClearSelectedValue();
  };

  const handleClearSelectedValue = () => {
    setValue('');

    const newFilteredValues: any = { ...filteredValues };

    newFilteredValues[type] = null;
    setFilteredValues(newFilteredValues);
  };

  useEffect(() => {
    const val = filteredValues[type];
    val === null ? setValue('') : val && setValue(val[0]);
  }, [filteredValues, type]);

  return (
    <>
      <StyledRoundedSelectContainer fullWidth>
        <InputLabel id={label} label={`Select ${label}`} size={size} />
        <StyledRoundedSelect
          active={value.length > 0 ? 1 : 0}
          size={size}
          label={label}
          labelId={label}
          value={value}
          onChange={handleSelectValueChange}
          endAdornment={<ClearButton inputCheck={value} onClick={handleClearSelectedValue} />}
        >
          {data
            ?.filter(({ name }) => name != 'none')
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
