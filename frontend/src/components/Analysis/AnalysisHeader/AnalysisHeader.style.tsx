import { Link } from 'react-router-dom';

import { styled, alpha, Box, List, Divider } from '@mui/material';

import { SearchField } from '../../base/Input/SearchField';

import { theme } from 'components/lib/theme';

export const StyledAnalysisHeader = styled(Box)({
  position: 'relative',
  zIndex: 6,
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  borderBottom: `1px solid ${theme.palette.grey.light}`,
  marginBottom: '20px',
  flexWrap: 'wrap',
  justifyContent: 'flex-start'
});

export const StyledAnalysisHeaderSearchField = styled(SearchField)(({ theme }) => ({
  minHeight: 40,
  padding: '10px 10px 4px 10px',
  '& .MuiInputBase-input': {
    padding: '11.5px 2px 11.5px 12px',
    fontSize: 12
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[200]
  },
  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: alpha(theme.palette.primary.main, 0.5)
  },
  '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main
  }
}));

export const StyledAnalysisHeaderLink = styled(Link)({
  color: 'inherit',
  textDecoration: 'none',
  width: '100%',
  height: '100%',
  padding: '11.5px 12px'
});

export const StyledAnalysisHeaderList = styled(List)({
  overflow: 'auto',
  maxHeight: '300px',
  padding: 0
});

export const StyledDivider = styled(Divider)({
  borderColor: theme.palette.grey.light,
  height: '36px',
  margin: '0 24px 0 24px'
});
