import React, { useEffect, useState } from 'react';

import { SelectChangeEvent, MenuItem } from '@mui/material';

import InputLabel from './components/InputLabel';
import ClearButton from './components/ClearButton';

import { StyledRoundedSelectContainer, StyledRoundedSelect } from './AnalysisItemSelect.style';
import { AnalysisItemSelectProps } from './AnalysisItemSelect.types';

const SingleSelect = ({
  size = 'small',
  label,
  data,
  type,
  activeFilter,
  setActiveFilter,
  setSelectValue
}: AnalysisItemSelectProps<string>) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (activeFilter !== type) {
      setValue('');
      setSelectValue('');
    }
  }, [setActiveFilter, setSelectValue, activeFilter, type]);

  const handleSelectValueChange = (event: SelectChangeEvent<typeof value>) => {
    const { value } = event.target;

    setActiveFilter(type);
    setSelectValue(value);
    setValue(value);
  };

  const handleClearSelectedValue = () => {
    setActiveFilter(null);
    setValue('');
    setSelectValue('');
  };

  return (
    <StyledRoundedSelectContainer fullWidth>
      <InputLabel id={label} label={label} size={size} />
      <StyledRoundedSelect
        size={size}
        label={label}
        labelId={label}
        value={value}
        onChange={handleSelectValueChange}
        endAdornment={<ClearButton isActive={value} onClick={handleClearSelectedValue} />}
      >
        {data.map(({ name }) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </StyledRoundedSelect>
    </StyledRoundedSelectContainer>
  );
};

export default SingleSelect;
