import { styled, Link } from '@mui/material';

export const StyledLink = styled(Link)({
  cursor: 'pointer',
  width: 'fit-content',
  marginTop: '5px !important',
  '&:hover': {
    textDecoration: 'none'
  }
});
