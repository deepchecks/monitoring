import Select from '@mui/material/Select';
import { styled, MenuProps, Box } from '@mui/material';

import { paletteOptions } from '../../theme/palette';

const StyledSelect = styled(Select)(({ theme }) => ({
  color: theme.palette.grey[500],
  backgroundColor: theme.palette.grey[200],
  borderRadius: '8px',
  border: 'none',
  fontSize: '16px',

  '& .MuiSelect-select': {
    padding: '9px 16px 7px'
  },

  '& .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline': {
    border: 'none'
  },

  '& svg': {
    color: 'inherit'
  }
}));

const menuProps = (searchField: boolean): Partial<MenuProps> => ({
  PaperProps: {
    style: {
      maxHeight: '300px',
      backgroundColor: paletteOptions.grey?.[200],
      borderRadius: '8px',
      marginTop: '8px'
    }
  },
  MenuListProps: {
    style: {
      paddingBottom: 0,
      paddingTop: searchField ? 0 : '8px'
    }
  }
});

const StyledStickyContainer = styled(Box)(() => ({
  zIndex: 1,
  top: 0,
  padding: '8px 16px',
  position: 'sticky',
  backgroundColor: paletteOptions.grey?.[200]
}));

const StyledBottomContainer = styled(Box)(() => ({
  zIndex: 3,
  bottom: 0,
  padding: '16px',
  cursor: 'pointer',
  position: 'sticky',
  backgroundColor: paletteOptions.grey?.[200]
}));

export { StyledSelect, menuProps, StyledStickyContainer, StyledBottomContainer };
