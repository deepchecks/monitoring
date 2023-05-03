import { styled, Typography } from '@mui/material';

const FirstOnBoardingTitle = styled(Typography)(({ theme }) => ({
  fontSize: 32,
  fontWeight: 600,
  color: theme.palette.primary.main,
  margin: '40px 0',
  minWidth: '400px'
}));

const FirstOnBoardingBoxLabel = styled(Typography)(({ theme }) => ({
  fontSize: 20,
  fontWeight: 800,
  color: theme.palette.primary.main,
  margin: '0 auto 20px'
}));

export { FirstOnBoardingTitle, FirstOnBoardingBoxLabel };
