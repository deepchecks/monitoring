import { styled, Divider, Link } from '@mui/material';

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
