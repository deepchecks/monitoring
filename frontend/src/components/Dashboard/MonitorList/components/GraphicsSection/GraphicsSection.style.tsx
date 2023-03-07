import { Box, Menu, MenuItem, styled } from '@mui/material';

import { theme } from 'theme';

export const StyledContainer = styled(Box)({
  padding: '32px 24px',
  border: `1px solid ${theme.palette.grey.light}`,
  borderRadius: '10px',
  height: '351px',

  '@media (max-width: 1536px)': {
    height: '317px',
    padding: '20px 16px'
  }
});

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
