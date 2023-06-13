import { Box, Link, styled, Typography } from '@mui/material';

import { StyledContainer } from 'components/lib';
import { isLargeDesktop } from 'components/lib/theme/typography';

const FirstOnBoardingTitle = styled(Typography)(({ theme }) => ({
  fontSize: 32,
  fontWeight: 600,
  color: theme.palette.primary.main,
  margin: '40px 0'
}));

const FirstOnBoardingOutlinedBox = styled(StyledContainer)(() => ({
  padding: 0,
  margin: 0,
  cursor: 'pointer'
}));

const FirstOnBoardingSelectContainer = styled(StyledContainer)(() => ({
  display: 'grid',
  gridTemplateColumns: 'auto 270px',
  alignItems: 'center'
}));

const OnBoardingDocsLink = styled(Link)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.primary.main,
  float: 'right',
  textDecoration: 'none',
  cursor: 'pointer'
}));

const OnBoardingStepperContainer = styled(Box)(({ theme }) => ({
  margin: '8px auto 0 0',
  display: 'flex',
  flexDirection: 'row',
  gap: '24px',

  '& .MuiStepContent-root, .MuiStepConnector-line': { borderColor: theme.palette.primary.main },
  '& .MuiStepConnector-root, .MuiStepContent-root': { marginLeft: 16 },
  '& .MuiStepLabel-label': { fontWeight: 700, color: theme.palette.grey[500], fontSize: isLargeDesktop ? 16 : 14 },
  '& .Mui-disabled': { fontWeight: 500 },
  '& .MuiSvgIcon-root': {
    width: '32px',
    height: '32px',
    marginRight: 4
  }
}));

const OnBoardingAdditionalContainer = styled(StyledContainer)({
  gap: '24px'
});

export {
  FirstOnBoardingTitle,
  FirstOnBoardingOutlinedBox,
  FirstOnBoardingSelectContainer,
  OnBoardingDocsLink,
  OnBoardingStepperContainer,
  OnBoardingAdditionalContainer
};
