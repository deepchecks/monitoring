import React, { useMemo, useEffect, useState } from 'react';

import { SelectChangeEvent, MenuItem } from '@mui/material';

import InputLabel from './components/InputLabel';
import ClearButton from './components/ClearButton';

import { StyledRoundedSelectContainer, StyledRoundedSelect, StyledMostWorstButton } from './AnalysisItemSelect.style';
import { AnalysisItemSelectProps } from './AnalysisItemSelect.types';
import { TypeMap } from 'components/AnalysisItem/AnalysisItem.types';

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
  setIsMostWorstActive,
  checkParams
}: AnalysisItemSelectProps<string>) => {
  const paramValue = useMemo(() => checkParams[TypeMap[type]], [checkParams[TypeMap[type]]]);
  const [value, setValue] = useState((paramValue != 'none' && paramValue) || '');


  const handleSetSelectValue = (value: string) => {
    setIsMostWorstActive(value ? false : !isMostWorstActive);

    setValue(value)
    filteredValues[type] = [value];
    setfilteredValues(filteredValues => ({ ...filteredValues }));
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
    filteredValues[type] = ['none'];
    setfilteredValues(filteredValues => ({ ...filteredValues }));
  };

  useEffect(() => {
    const val = filteredValues[type]
    if (val) {
      if (val[0] != 'none') {
        setValue(val[0]);
      }
      else {
        setValue('');
      }
    }
  }, [filteredValues[type]])

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
          {data?.filter(({ name }) => name != 'none').map(({ name }) => (
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
