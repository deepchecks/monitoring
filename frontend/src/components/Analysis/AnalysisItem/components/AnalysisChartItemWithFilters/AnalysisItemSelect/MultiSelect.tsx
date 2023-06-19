import React, { useState, useMemo, ChangeEvent } from 'react';

import { SelectChangeEvent, MenuItem, ListItemText, Button, MenuProps as IMenuProps, Tooltip } from '@mui/material';

import InputLabel from './components/InputLabel';
import ClearButton from './components/ClearButton';
import ResetSelectionButton from './components/ResetSelectionButton';

import {
  StyledRoundedSelectContainer,
  StyledRoundedSelect,
  StyledCheckbox,
  StyledStickyContainer,
  StyledApplyButton,
  StyledNoResults,
  StyledSearchField,
  StyledMostWorstButton
} from './AnalysisItemSelect.style';

import { AnalysisItemSelectProps, MultiSelectValuesType } from './AnalysisItemSelect.types';
import { CheckFilterTypes, TypeMap } from 'helpers/utils/checkUtil';
import { MonitorValueConf } from 'api/generated';

const MAX_MENU_ITEM_TEXT_LENGTH = 21;

const MenuProps: Partial<IMenuProps> = {
  MenuListProps: {
    style: {
      padding: 0
    }
  },
  PaperProps: {
    style: {
      width: 280,
      maxHeight: 600
    }
  }
};

export function getNameFromData(name: string | undefined, data: MonitorValueConf[] | undefined) {
  if (name) {
    const indexFromData = data
      ?.map(val => val.name.replaceAll('_', ' ').toLowerCase())
      .lastIndexOf(name.replaceAll('_', ' ').toLowerCase());

    if (indexFromData && indexFromData !== -1) {
      return data?.at(indexFromData)?.name;
    }
  }

  return undefined;
}

const MultiSelect = ({
  size = 'small',
  label,
  data,
  type,
  isMostWorstActive,
  filteredValues,
  setFilteredValues,
  setIsMostWorstActive,
  checkParams
}: AnalysisItemSelectProps) => {
  const defaultSelectedValues = useMemo(() => {
    const paramValues: string[] = Object.values(checkParams[TypeMap[type]] || []);
    return (
      (paramValues.map(name => getNameFromData(name, data)).filter(val => typeof val == 'string') as string[]) || []
    );
  }, [checkParams, data, type]);

  const [filteredData, setFilteredData] = useState(data);
  const [open, setOpen] = useState(false);
  const [savedMultiValue, setSavedMultiValue] = useState<MultiSelectValuesType>(defaultSelectedValues);
  const [multiValue, setMultiValue] = useState<MultiSelectValuesType>(defaultSelectedValues);
  const [searchFieldValue, setSearchFieldValue] = useState('');

  const handleClose = (isApplyClicked?: boolean) => {
    setOpen(false);

    if (!isApplyClicked || !filteredData?.length || multiValue.length + savedMultiValue.length === 0) {
      setTimeout(() => {
        setMultiValue(savedMultiValue);
        clearSearchField();
      }, 200);

      return;
    }

    setSavedMultiValue(multiValue);
    setIsMostWorstActive(false);

    if (multiValue.length == 0) {
      handleClearSelectedValue();
      return;
    }

    const newFilteredValues = { ...filteredValues };

    newFilteredValues[type] = multiValue;

    if (
      !newFilteredValues[CheckFilterTypes.AGGREGATION] ||
      newFilteredValues[CheckFilterTypes.AGGREGATION]?.[0] == 'none'
    ) {
      newFilteredValues[CheckFilterTypes.AGGREGATION] = null;
    }

    setFilteredValues(newFilteredValues);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleSelectValueChange = (event: SelectChangeEvent<unknown>) => {
    const { value } = event.target;
    const val = (typeof value === 'string' ? value.split(',') : value) as MultiSelectValuesType;

    setMultiValue(val);
  };

  const handleWorstPerformersClick = () => {
    if (!isMostWorstActive) {
      const perClassMetric = getNameFromData(multiValue[0].split(' ')[0] + ' Per Class', data);
      if (!perClassMetric) return;

      setMultiValue([perClassMetric]);
      setSavedMultiValue([perClassMetric]);

      const newFilteredValues = { ...filteredValues };

      newFilteredValues[type] = [perClassMetric];
      setFilteredValues(newFilteredValues);
    }
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

    const newFilteredValues = { ...filteredValues };

    newFilteredValues[type] = null;
    setFilteredValues(newFilteredValues);

    setIsMostWorstActive(false);
  };

  const handleResetSelection = () => {
    setMultiValue([]);
  };

  return (
    <>
      {type === CheckFilterTypes.SCORER && data && data.filter(val => !val.is_agg).length > 0 && (
        <StyledMostWorstButton
          disabled={!(multiValue.length == 1 && multiValue[0].includes(' '))}
          title={'Only available if 1 scorer is selected and supports a per class metric'}
          active={isMostWorstActive}
          onClick={handleWorstPerformersClick}
          sx={{ minWidth: '180px' }}
        >
          Worst performed classes
        </StyledMostWorstButton>
      )}
      <StyledRoundedSelectContainer fullWidth>
        <InputLabel id={label} label={`Select ${label}`} size={size} />
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
          renderValue={selected =>
            (selected as Array<string>).length > 1
              ? `Selected ${label}s (${(selected as Array<string>).length})`
              : (selected as Array<string>)[0]
          }
          MenuProps={MenuProps}
          endAdornment={<ClearButton inputCheck={multiValue.length} onClick={handleClearSelectedValue} />}
        >
          <StyledStickyContainer>
            <StyledSearchField
              placeholder={`Search ${label}`}
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
