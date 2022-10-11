import { alpha, Box, ListItem, styled, Typography } from '@mui/material';

interface StyledContainerProps {
  active: boolean;
}

export const StyledContainer = styled(ListItem, { shouldForwardProp: prop => prop !== 'active' })<StyledContainerProps>(
  ({ active, theme }) => {
    const style = {
      ':last-of-type': {
        border: 'none'
      },
      borderBottom: `1px dotted ${theme.palette.text.disabled}`
    };
    return {
      padding: '16px 38px 16px 30px',
      cursor: 'pointer',
      position: 'relative',
      backgroundColor: active ? 'rgba(209, 216, 220, 0.5)' : theme.palette.common.white,
      ':hover': {
        backgroundColor: theme.palette.grey[100]
      },
      ...style
    };
  }
);

export const StyledModelInfo = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%'
});

export const StyledTypographyDate = styled(Typography)({
  marginTop: '4px'
});

export const StyledAlert = styled(Box)(({ theme }) => ({
  width: 50,
  height: 60,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: alpha(theme.palette.error.main, 0.1),
  borderRadius: '20px',
  cursor: 'pointer'
}));
