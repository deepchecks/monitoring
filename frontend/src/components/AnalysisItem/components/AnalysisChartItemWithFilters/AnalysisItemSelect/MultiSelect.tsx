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

/*eslint no-param-reassign: ["error", { "props": false }]*/
const MultiSelect = ({
  size = 'small',
  label,
  data,
  type,
  isMostWorstActive,
  filteredValues,
  setfilteredValues,
  setIsMostWorstActive
}: AnalysisItemSelectProps<MultiSelectValuesType>) => {
  const [filteredData, setFilteredData] = useState(data);
  const [open, setOpen] = useState(false);
  const [multiValue, setMultiValue] = useState<MultiSelectValuesType>([]);
  const [savedMultiValue, setSavedMultiValue] = useState<MultiSelectValuesType>([]);
  const [searchFieldValue, setSearchFieldValue] = useState('');

  const handleClose = (isApplyClicked?: boolean) => {
    setOpen(false);

    if (!isApplyClicked || !filteredData?.length) {
      setTimeout(() => {
        setMultiValue(savedMultiValue);
        clearSearchField();
      }, 200);

      return;
    }

    filteredValues[type] = multiValue;
    if (!filteredValues[AnalysisItemFilterTypes.AGGREGATION])
      filteredValues[AnalysisItemFilterTypes.AGGREGATION] = ['none'];
    setfilteredValues(filteredValues => ({...filteredValues}));
    };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleSelectValueChange = (event: SelectChangeEvent<unknown>) => {
    const { value } = event.target;
    const val = (typeof value === 'string' ? value.split(',') : value) as MultiSelectValuesType;

    setMultiValue(val);
    setSavedMultiValue(val);
  };

  const handleWorstPerformersClick = () => {
    setIsMostWorstActive(!isMostWorstActive);
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
    setMultiValue([]);
    setSavedMultiValue([]);
    delete filteredValues[type];
    setfilteredValues(filteredValues => ({...filteredValues}));
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
        <InputLabel id={label} label={`Select ${label}`} size={size} />
        <StyledRoundedSelect
          active={multiValue.length > 0 ? 1 : 0}
          size={size}
          label={label}
          labelId={label}
          multiple
          value={multiValue}
          onChange={handleSelectValueChange}
          open={open}
          onOpen={handleOpen}
          onClose={() => handleClose(false)}
          renderValue={selected => `Selected ${label}s (${(selected as Array<string>).length})`}
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
        </StyledRoundedSelect >
      </StyledRoundedSelectContainer >
    </>
  );
};

export default MultiSelect;
