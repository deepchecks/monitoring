import {
  styled,
  alpha,
  FormControl,
  Box,
  InputLabel,
  Select,
  Button,
  IconButton,
  Checkbox,
  Typography
} from '@mui/material';

import { SearchField } from 'components/SearchField';

export const StyledRoundedSelectContainer = styled(FormControl)({
  position: 'relative',
  minHeight: 30,
  height: 30
});

export const StyledRoundedSelectInputLabel = styled(InputLabel)(({ theme }) => ({
  transform: 'translate(14px, 7px) scale(1)',

  '&.MuiFormLabel-root.MuiInputLabel-root': {
    color: theme.palette.primary.main
  },

  '&.Mui-focused, &.MuiFormLabel-filled': {
    transform: 'translate(14px, -5px) scale(0.75)',
    color: theme.palette.primary.main
  }
}));

export const StyledRoundedSelect = styled(Select)(({ theme }) => ({
  minWidth: 192,
  minHeight: 30,
  fontSize: 12,
  lineHeight: '17px',
  letterSpacing: '0.1px',
  color: theme.palette.primary.main,
  borderRadius: '1000px',

  '& .MuiOutlinedInput-notchedOutline, &:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main
  },

  '& .MuiSelect-select': {
    padding: '6.5px 22px 6.5px 10px'
  },

  '& svg': {
    color: theme.palette.primary.main
  }
})) as unknown as typeof Select;

export const StyledRoundedSelectCloseButton = styled(IconButton)({
  position: 'absolute',
  right: '27px',
  bottom: '5px',
  width: '15px',
  padding: 0,
  background: 'transparent'
});

export const StyledSearchField = styled(SearchField)({
  padding: '15px 16px 0',
  width: '100%',

  '& .MuiInputBase-input': {
    fontSize: 12,
    padding: '11.5px 14px'
  }
});

export const StyledMenuItemsList = styled(Box)({
  overflowX: 'auto',
  maxHeight: 330
});

export const StyledCheckbox = styled(Checkbox)({
  justifyContent: 'flex-start',
  minWidth: '29px'
});

export const StyledStickyContainer = styled(Box)(({ theme }) => ({
  zIndex: 1,
  position: 'sticky',
  top: 0,
  background: theme.palette.common.white
}));

export const StyledResetSelectionButton = styled(Button)({
  fontWeight: 400,
  fontSize: 12,
  lineHeight: '16.8px',
  marginLeft: '14px',
  padding: '2px'
});

export const StyledNoResults = styled(Typography)(({ theme }) => ({
  fontWeight: 400,
  fontSize: 12,
  lineHeight: '16.8px',
  marginLeft: '14px',
  padding: '8px 6px 19px',
  color: theme.palette.error.contrastText
}));

export const StyledApplyButton = styled(Box)(({ theme }) => ({
  position: 'sticky',
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '9px 0',
  background: theme.palette.common.white,
  borderTop: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`
}));

interface StyledMostWorstButtonOptions {
  active: boolean;
}

export const StyledMostWorstButton = styled(Button, {
  shouldForwardProp: prop => prop !== 'active'
})<StyledMostWorstButtonOptions>(({ active, theme }) => ({
  fontSize: 12,
  letterSpacing: '0.17px',
  fontWeight: active ? 700 : 400,
  lineHeight: '16.8px',
  minWidth: 120,
  minHeight: 30,
  padding: 0,
  margin: 0,
  color: theme.palette.primary.main,
  backgroundColor: active ? theme.palette.primary.light : theme.palette.common.white,
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: '1000px',
  boxShadow: 'none',

  '&:hover': {
    color: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main
  }
}));
