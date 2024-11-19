import React, { useState, useEffect } from 'react';

import { FormControl } from '@mui/material';
import { SelectProps } from '@mui/material/Select';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { Input } from '../Input/Input';

import { StyledSelect, menuProps, StyledStickyContainer, StyledBottomContainer } from './Dropdown.styles';

import { Text } from '../Text/Text';
import { DropdownItem } from './DropdownItem';

interface DropdownProps extends SelectProps {
  label?: string;
  data: {
    name: string;
    amount?: string;
  }[];
  value: string | undefined;
  setValue: (value: string) => void;
  searchField?: boolean;
  bottomBtn?: {
    label?: string;
    action: () => void;
  };
}

export const Dropdown = (props: DropdownProps) => {
  const { label = '', data, value, setValue, searchField, bottomBtn, ...otherProps } = props;

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

  const handleChange = (name: string) => {
    setValue(name);
    handleClose();
    setInputValue('');
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
        data-testid="dropdown"
        IconComponent={ExpandMoreIcon}
        MenuProps={menuProps(!!searchField)}
        renderValue={() => (value ? value : label)}
        autoWidth
        displayEmpty
        {...otherProps}
      >
        {searchField && (
          <StyledStickyContainer>
            <Input
              value={inputValue}
              onChange={handleSearch}
              onCloseIconClick={resetInput}
              placeholder={`Search ${label}`}
              onKeyDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              searchField
              sx={theme => ({
                width: 1,
                color: theme.palette.grey[500],

                '&::before, ::after': {
                  borderColor: theme.palette.grey[500],
                  opacity: 0.3,

                  '&:hover': {
                    borderColor: theme.palette.grey[500]
                  }
                },
                '& svg': { opacity: 0.3 }
              })}
            />
          </StyledStickyContainer>
        )}
        <DropdownItem state={state} inputValue={inputValue} selectedValue={value} handleChange={handleChange} />
        {bottomBtn?.label && (
          <StyledBottomContainer onClick={() => bottomBtn.action()}>
            <Text text={bottomBtn?.label} color="primary" type="bodyBold" />
          </StyledBottomContainer>
        )}
      </StyledSelect>
    </FormControl>
  );
};
