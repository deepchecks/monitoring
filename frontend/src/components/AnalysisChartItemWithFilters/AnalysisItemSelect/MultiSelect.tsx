import React, { useState, ChangeEvent, useEffect } from 'react';

import { SelectChangeEvent, MenuItem, ListItemText, Button, MenuProps as IMenuProps } from '@mui/material';

import InputLabel from './components/InputLabel';
import ClearButton from './components/ClearButton';
import ResetSelectionButton from './components/ResetSelectionButton';
import { SearchField } from 'components/SearchField';

import {
  StyledRoundedSelectContainer,
  StyledRoundedSelect,
  // StyledMenuItemsList,
  StyledCheckbox,
  StyledStickyContainer,
  StyledApplyButton,
  StyledNoResults
} from './AnalysisItemSelect.style';
import { AnalysisItemSelectProps } from './AnalysisItemSelect.types';

type SelectValuesType = string[];

const MenuProps: Partial<IMenuProps> = {
  MenuListProps: {
    style: {
      padding: 0,
      overflow: 'auto'
    }
  },
  PaperProps: {
    style: {
      width: 280
    }
  }
};

const MultiSelect = ({
  size = 'small',
  label,
  data,
  type,
  activeFilter,
  setActiveFilter,
  setSelectValue
}: AnalysisItemSelectProps<SelectValuesType>) => {
  const [filteredValues, setFilteredValues] = useState(data);
  const [multiValue, setMultiValue] = useState<SelectValuesType>([]);
  const [savedMultiValue, setSavedMultiValue] = useState<SelectValuesType>([]);
  const [searchFieldValue, setSearchFieldValue] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (activeFilter !== type) {
      setMultiValue([]);
      setSelectValue([]);
    }
  }, [setActiveFilter, setSelectValue, activeFilter, type]);

  const handleClose = (isApplyClicked?: boolean) => {
    setOpen(false);

    if (!isApplyClicked || !filteredValues.length) {
      setTimeout(() => {
        setMultiValue(savedMultiValue);
        clearSearchField();
      }, 200);
      return;
    }

    setActiveFilter(type);
    setSelectValue(multiValue);
    setSavedMultiValue(multiValue);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleSelectValueChange = (event: SelectChangeEvent<typeof multiValue>) => {
    const { value } = event.target;

    const val = typeof value === 'string' ? value.split(',') : value;

    setMultiValue(val);
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    const filtered = data.filter(v => v.name.toLowerCase().includes(value.toLowerCase().trim()));

    setSearchFieldValue(value);
    setFilteredValues(filtered);
  };

  const clearSearchField = () => {
    setSearchFieldValue('');
    setFilteredValues(data);
  };

  const handleClearSelectedValue = () => {
    setActiveFilter(null);
    setMultiValue([]);
    setSavedMultiValue([]);
    setSelectValue([]);
  };

  const handleResetSelection = () => {
    setMultiValue([]);
  };

  return (
    <StyledRoundedSelectContainer fullWidth>
      <InputLabel id={label} label={label} size={size} />
      <StyledRoundedSelect
        size={size}
        label={label}
        labelId={label}
        multiple
        value={multiValue}
        onChange={handleSelectValueChange}
        open={open}
        onOpen={handleOpen}
        onClose={() => handleClose(false)}
        renderValue={selected => `Selected classes (${selected.length})`}
        MenuProps={MenuProps}
        endAdornment={<ClearButton isActive={multiValue.length} onClick={handleClearSelectedValue} />}
      >
        <StyledStickyContainer>
          <SearchField
            value={searchFieldValue}
            onChange={handleSearch}
            onReset={clearSearchField}
            onKeyDown={e => e.stopPropagation()}
            sx={{ p: '15px 16px 0' }}
          />
          <ResetSelectionButton isAnythingSelected={multiValue.length} onClick={handleResetSelection} />
        </StyledStickyContainer>

        {/* <StyledMenuItemsList> */}
        {filteredValues.length ? (
          filteredValues.map(({ name }) => (
            <MenuItem key={name} value={name} sx={{ p: '10px 15px' }}>
              <StyledCheckbox
                checked={multiValue.indexOf(name) > -1}
                tabIndex={-1}
                inputProps={{ 'aria-labelledby': name }}
              />
              <ListItemText primary={name} />
            </MenuItem>
          ))
        ) : (
          <StyledNoResults>0 Results, try a different combination</StyledNoResults>
        )}
        {/* </StyledMenuItemsList> */}

        <StyledApplyButton>
          <Button onClick={() => handleClose(true)} variant="text">
            Apply
          </Button>
        </StyledApplyButton>
      </StyledRoundedSelect>
    </StyledRoundedSelectContainer>
  );
};

export default MultiSelect;
