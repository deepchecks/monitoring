import React, { useEffect, useState, useCallback } from 'react';

import { SelectChangeEvent, MenuItem } from '@mui/material';

import InputLabel from './components/InputLabel';
import ClearButton from './components/ClearButton';

import { StyledRoundedSelectContainer, StyledRoundedSelect, StyledMostWorstButton } from './AnalysisItemSelect.style';
import { AnalysisItemSelectProps } from './AnalysisItemSelect.types';
import { AGGREGATION_NONE } from 'components/AnalysisItem/AnalysisItem.types';

const SingleSelect = ({
  size = 'small',
  label,
  data,
  type,
  activeFilter,
  isMostWorstActive,
  setActiveFilter,
  setSelectValue,
  setIsMostWorstActive
}: AnalysisItemSelectProps<string>) => {
  const [value, setValue] = useState('');

  const handleSetSelectValue = (value?: string) => {
    setIsMostWorstActive(value ? false : !isMostWorstActive);

    const val = value || AGGREGATION_NONE;

    setActiveFilter(type);
    setSelectValue(val);
    setValue(val);
  };

  const handleSelectValueChange = (event: SelectChangeEvent<typeof value>) => {
    const { value } = event.target;
    handleSetSelectValue(value);
  };

  const handleMostDriftedClick = () => {
    if (isMostWorstActive) {
      setValue('');
      setSelectValue('');
      setIsMostWorstActive(false);

      return;
    }

    setIsMostWorstActive(true);
    handleSetSelectValue();
  };

  const handleClearSelectedValue = useCallback(() => {
    setActiveFilter(null);
    setValue('');
    setSelectValue('');
    setIsMostWorstActive(false);
  }, [setActiveFilter, setSelectValue, setIsMostWorstActive]);

  useEffect(() => {
    if (activeFilter !== type) {
      setValue('');
      setSelectValue('');
    }
  }, [setSelectValue, activeFilter, type]);

  return (
    <>
      <StyledRoundedSelectContainer fullWidth>
        <InputLabel id={label} label={label} size={size} />
        <StyledRoundedSelect
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
        Most drifted
      </StyledMostWorstButton>
    </>
  );
};

export default SingleSelect;
