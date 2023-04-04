import { Button, styled, Divider, Link, Stack } from '@mui/material';

export const StyledFormContainer = styled(Stack)({
  height: 'calc(100% - 100px)',
  overflowY: 'auto',
  overflowX: 'hidden'
});

export const StyledButton = styled(Button)({
  width: '143px',
  margin: '0 auto'
});

export const StyledDivider = styled(Divider)({
  border: '1px dashed #94A4AD'
});

export const StyledLink = styled(Link)({
  cursor: 'pointer',
  width: 'fit-content',
  marginTop: '5px !important',
  '&:hover': {
    textDecoration: 'none'
  }
});
