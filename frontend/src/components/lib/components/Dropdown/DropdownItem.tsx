import React from 'react';

import { MenuItem } from '@mui/material';
import { SelectProps } from '@mui/material/Select';

import { Text } from '../Text/Text';
import { highlightText } from './Dropdown.helpers';

import { paletteOptions } from '../../theme/palette';

interface DropdownItemProps extends SelectProps {
  state: {
    name: string;
    amount?: string;
  }[];
  inputValue: string;
  handleChange: (name: string) => void;
  selectedValue: string | undefined;
}

const NO_RESULTS_STRING = 'No results, try a different combination';

export const DropdownItem = (props: DropdownItemProps) => {
  const { inputValue, state, handleChange, selectedValue } = props;

  return (
    <>
      {state.length > 0 ? (
        state.map(({ name, amount }, i) => (
          <MenuItem
            key={i + name}
            value={name}
            onClick={handleChange.bind(null, name)}
            selected={selectedValue === name}
          >
            <Text
              text={inputValue ? highlightText(name, inputValue) : name}
              type="button"
              sx={{ marginRight: '20px', color: paletteOptions.grey?.[500] }}
            />
            {amount && (
              <Text text={amount} type="tiny" sx={{ marginLeft: 'auto', color: paletteOptions.grey?.[500] }} />
            )}
          </MenuItem>
        ))
      ) : (
        <Text
          type="small"
          text={NO_RESULTS_STRING}
          sx={theme => ({ color: theme.palette.grey[500], margin: '2px 16px 8px 16px' })}
        />
      )}
    </>
  );
};
