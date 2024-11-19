import { Box, Menu, MenuItem, styled, Typography } from '@mui/material';

import { theme } from 'components/lib/theme';

export const StyledContainer = styled(Box)(({ theme }) => ({
  padding: '32px 24px',
  border: `1px solid ${theme.palette.grey.light}`,
  borderRadius: '16px',
  height: '100%',
  minHeight: '402px',
  background: theme.palette.common.white,

  '@media (max-width: 1536px)': {
    minHeight: '317px',
    padding: '20px 16px'
  }
}));

export const StyledRootMenu = styled(Menu)({
  marginTop: '9px',

  '& .MuiPaper-root': {
    overflow: 'visible',
    padding: '6px 0',
    borderRadius: '10px',
    boxShadow: '2px 2px 30px -10px rgba(41, 53, 67, 0.25)'
  }
});

export const StyledMenuItem = styled(MenuItem)({
  position: 'relative',
  padding: '12px 17px'
});

export const StyledText = styled(Typography)({
  fontSize: '14px',
  lineHeight: '32px',
  marginTop: 'auto',
  paddingTop: '16px',
  color: theme.palette.grey[600]
});
