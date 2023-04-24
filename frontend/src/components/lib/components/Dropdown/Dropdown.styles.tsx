import { styled, MenuProps, Box } from '@mui/material';
import Select from '@mui/material/Select';

import { paletteOptions } from '../../theme/palette';

const StyledSelect = styled(Select)(({ theme }) => ({
  color: theme.palette.common.white,
  backgroundColor: theme.palette.primary.main,
  borderRadius: '28px',
  border: 'none',

  '& .MuiSelect-select': {
    padding: '5.5px 16px 6.5px 16px'
  },

  '& .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline': {
    border: 'none'
  },

  '& svg': {
    color: 'inherit'
  }
}));

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const menuProps = (searchField: boolean): Partial<MenuProps> => ({
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6.5 + ITEM_PADDING_TOP,
      backgroundColor: (paletteOptions.primary as any).main,
      borderRadius: '8px',
      marginTop: '8px'
    }
  },
  MenuListProps: {
    style: {
      paddingTop: searchField ? 0 : '8px'
    }
  }
});

const StyledStickyContainer = styled(Box)(({ theme }) => ({
  zIndex: 1,
  position: 'sticky',
  top: 0,
  padding: '8px 16px',
  backgroundColor: theme.palette.primary.main
}));

export { StyledSelect, menuProps, StyledStickyContainer };
