import React, { useEffect, useState, useCallback } from 'react';

import { SelectChangeEvent, MenuItem } from '@mui/material';

import InputLabel from './components/InputLabel';
import ClearButton from './components/ClearButton';

import { StyledRoundedSelectContainer, StyledRoundedSelect, StyledMostWorstButton } from './AnalysisItemSelect.style';
import { AnalysisItemSelectProps } from './AnalysisItemSelect.types';
import { AGGREGATION_NONE } from 'components/AnalysisItem/AnalysisItem.types';

/*eslint no-param-reassign: ["error", { "props": false }]*/
const SingleSelect = ({
  size = 'small',
  label,
  data,
  type,
  isMostWorstActive,
  filteredValues,
  isDriftCheck,
  setfilteredValues,
  setIsMostWorstActive
}: AnalysisItemSelectProps<string>) => {
  const [value, setValue] = useState('');

  const handleSetSelectValue = (value?: string) => {
    setIsMostWorstActive(value ? false : !isMostWorstActive);
  
    const val = value || AGGREGATION_NONE;
    setValue(val)
    filteredValues[type] = [val];
    setfilteredValues(filteredValues => ({...filteredValues}));
  };

  useEffect(() => {
    if (filteredValues[type])
      setValue(filteredValues[type][0]);
  }, [filteredValues]);

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
    handleSetSelectValue();
  };

  const handleClearSelectedValue = () => {
    setValue('');
    delete filteredValues[type];
    setfilteredValues(filteredValues => ({...filteredValues}));
  };


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
          {data?.map(({ name }) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </StyledRoundedSelect>
      </StyledRoundedSelectContainer>
      <StyledMostWorstButton active={isMostWorstActive} onClick={handleMostDriftedClick}>
        { isDriftCheck ? 'Most Drifted' : 'Highest Values'}
      </StyledMostWorstButton>
    </>
  );
};

export default SingleSelect;
