import React, { useState, useEffect } from 'react';

import { FormControl, MenuItem } from '@mui/material';
import { SelectChangeEvent, SelectProps } from '@mui/material/Select';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { Text } from '../Text/Text';
import { Input } from '../Input/Input';

import { StyledSelect, menuProps, StyledStickyContainer } from './Dropdown.styles';
import { highlightText } from './Dropdown.helpers';

interface DropdownProps extends SelectProps {
  label: string;
  data: {
    name: string;
    amount: string;
  }[];
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  searchField?: boolean;
}

const NO_RESULTS_STRING = 'No results, try a different combination';

export const Dropdown = (props: DropdownProps) => {
  const { label, data, value, setValue, searchField, ...otherProps } = props;

  const [open, setOpen] = useState(false);
  const [state, setState] = useState(data);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!inputValue) setState(data);
  }, [inputValue, data]);

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setState(data);
  };

  const handleChange = (event: SelectChangeEvent<unknown>) => {
    setValue(event.target.value as string);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setInputValue(value);
    setState(data.filter(item => item.name.toLowerCase().includes(value.toLowerCase().trim())));
  };

  const resetInput = () => {
    setInputValue('');
    setState(data);
  };

  return (
    <FormControl>
      <StyledSelect
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        MenuProps={menuProps(!!searchField)}
        value={value}
        onChange={handleChange}
        displayEmpty
        renderValue={() => (value ? value : label)}
        IconComponent={ExpandMoreIcon}
        autoWidth
        {...otherProps}
      >
        {searchField && (
          <StyledStickyContainer>
            <Input
              value={inputValue}
              onCloseIconClick={resetInput}
              placeholder={`Search ${label}`}
              searchField
              onChange={handleSearch}
              onKeyDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              sx={theme => ({
                width: 1,
                color: theme.palette.common.white,

                '&::before, ::after': {
                  borderColor: theme.palette.common.white,
                  opacity: 0.3,

                  '&:hover': {
                    borderColor: theme.palette.common.white
                  }
                },
                '& svg': { opacity: 0.3 }
              })}
            />
          </StyledStickyContainer>
        )}
        {state.length > 0 ? (
          state.map(({ name, amount }, i) => (
            <MenuItem key={i + name} value={name}>
              <Text
                text={inputValue ? highlightText(name, inputValue) : name}
                type="button"
                sx={{ marginRight: '20px', color: 'white' }}
              />
              <Text text={amount} type="tiny" sx={{ marginLeft: 'auto', color: 'white' }} />
            </MenuItem>
          ))
        ) : (
          <Text
            type="smallNormal"
            text={NO_RESULTS_STRING}
            sx={theme => ({ color: theme.palette.common.white, margin: '2px 16px 8px 16px' })}
          />
        )}
      </StyledSelect>
    </FormControl>
  );
};
