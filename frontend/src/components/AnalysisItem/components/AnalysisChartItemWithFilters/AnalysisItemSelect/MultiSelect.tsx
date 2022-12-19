import React, { useState, ChangeEvent, useEffect } from 'react';

import { SelectChangeEvent, MenuItem, ListItemText, Button, MenuProps as IMenuProps, Tooltip } from '@mui/material';

import InputLabel from './components/InputLabel';
import ClearButton from './components/ClearButton';
import ResetSelectionButton from './components/ResetSelectionButton';

import {
  StyledRoundedSelectContainer,
  StyledRoundedSelect,
  // StyledMenuItemsList,
  StyledCheckbox,
  StyledStickyContainer,
  StyledApplyButton,
  StyledNoResults,
  StyledSearchField,
  StyledMostWorstButton
} from './AnalysisItemSelect.style';

import { AnalysisItemSelectProps, MultiSelectValuesType } from './AnalysisItemSelect.types';
import { AnalysisItemFilterTypes } from 'components/AnalysisItem/AnalysisItem.types';

const MAX_MENU_ITEM_TEXT_LENGTH = 21;

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
  isMostWorstActive,
  setActiveFilter,
  setSelectValue,
  setIsMostWorstActive
}: AnalysisItemSelectProps<MultiSelectValuesType>) => {
  const [filteredData, setFilteredData] = useState(data);
  const [open, setOpen] = useState(false);
  const [multiValue, setMultiValue] = useState<MultiSelectValuesType>([]);
  const [savedMultiValue, setSavedMultiValue] = useState<MultiSelectValuesType>([]);
  const [searchFieldValue, setSearchFieldValue] = useState('');

  useEffect(() => {
    if (activeFilter !== type) {
      setMultiValue([]);
      setSelectValue([]);
    }
  }, [setSelectValue, activeFilter, type]);

  const handleClose = (isApplyClicked?: boolean) => {
    setOpen(false);

    if (!isApplyClicked || !filteredData?.length) {
      setTimeout(() => {
        setMultiValue(savedMultiValue);
        clearSearchField();
      }, 200);

      return;
    }

    setActiveFilter(type);
    setSelectValue(multiValue);
    setSavedMultiValue(multiValue);
    setIsMostWorstActive(false);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleSelectValueChange = (event: SelectChangeEvent<typeof multiValue>) => {
    const { value } = event.target;
    const val = typeof value === 'string' ? value.split(',') : value;

    setMultiValue(val);
  };

  const handleWorstPerformersClick = () => {
    setIsMostWorstActive(!isMostWorstActive);
    handleClearSelectedValue();
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const filtered = data?.filter(item => item.name.toLowerCase().includes(value.toLowerCase().trim()));

    setSearchFieldValue(value);
    setFilteredData(filtered);
  };

  const clearSearchField = () => {
    setSearchFieldValue('');
    setFilteredData(data);
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
    <>
      {type === AnalysisItemFilterTypes.SCORER && (
        <StyledMostWorstButton active={isMostWorstActive} onClick={handleWorstPerformersClick}>
          Worst performers
        </StyledMostWorstButton>
      )}
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
          endAdornment={<ClearButton inputCheck={multiValue.length} onClick={handleClearSelectedValue} />}
        >
          <StyledStickyContainer>
            <StyledSearchField
              value={searchFieldValue}
              onChange={handleSearch}
              onReset={clearSearchField}
              onKeyDown={e => e.stopPropagation()}
            />
            <ResetSelectionButton isAnythingSelected={multiValue.length} onClick={handleResetSelection} />
          </StyledStickyContainer>

          {/* <StyledMenuItemsList> */}
          {filteredData?.length ? (
            filteredData.map(({ name }) => (
              <MenuItem key={name} value={name} sx={{ p: '10px 15px' }}>
                <StyledCheckbox
                  checked={multiValue.indexOf(name) > -1}
                  tabIndex={-1}
                  inputProps={{ 'aria-labelledby': name }}
                />
                {name.length > MAX_MENU_ITEM_TEXT_LENGTH ? (
                  <Tooltip
                    title={name}
                    placement="left-end"
                    PopperProps={{
                      modifiers: [
                        {
                          name: 'offset',
                          options: {
                            offset: [0, 18]
                          }
                        }
                      ]
                    }}
                  >
                    <ListItemText primary={`${name.slice(0, MAX_MENU_ITEM_TEXT_LENGTH)}...`} />
                  </Tooltip>
                ) : (
                  <ListItemText primary={name} />
                )}
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
    </>
  );
};

export default MultiSelect;
