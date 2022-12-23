import { Stack, Box, styled } from '@mui/material';

export const StyledStackWrapper = styled(Stack)({
  height: '100%'
});

export const StyledSubCategory = styled(Box)(({ theme }) => ({
  margin: '9px 8px 0 6px',
  width: 26,
  height: 50,
  borderLeft: `1px solid ${theme.palette.grey[200]}`,
  borderBottom: `1px solid ${theme.palette.grey[200]}`,
  position: 'relative',
  '::after': {
    content: "''",
    display: 'block',
    width: 4,
    height: 4,
    backgroundColor: theme.palette.grey[200],
    borderRadius: '50%',
    position: 'absolute',
    right: '-2px',
    bottom: '-2px'
  }
}));

export const StyledFlexWrapper = styled(Box)({
  display: 'flex'
});

export const StyledChildrenWrapper = styled(Box)({
  width: '100%',
  marginTop: '38px'
});
