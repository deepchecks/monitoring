import { Box, Typography, styled } from '@mui/material';

const StyledTypography = styled(Typography)({
  marginBottom: '40px'
});

const StyledLink = styled(Typography)({
  display: 'inline-block',
  textDecoration: 'underline',
  cursor: 'pointer'
});

const StyledContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  width: '1100px',
  padding: '30px',
  borderRadius: '5px',
  border: `1px solid ${theme.palette.grey.light}`,
  background: theme.palette.grey[100]
}));

const StyledApiKey = styled(Typography)({
  fontWeight: 700,
  fontSize: '24px',
  lineHeight: '140%',
  display: 'flex',
  flexGrow: 1,
  wordBreak: 'break-all'
});

export { StyledApiKey, StyledContainer, StyledLink, StyledTypography };
