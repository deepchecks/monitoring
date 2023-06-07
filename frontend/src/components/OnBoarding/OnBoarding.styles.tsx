import { Box, Link, styled, Typography } from '@mui/material';

import { StyledContainer } from 'components/lib';
import { isLargeDesktop } from 'components/lib/theme/typography';

const FirstOnBoardingTitle = styled(Typography)(({ theme }) => ({
  fontSize: 32,
  fontWeight: 600,
  color: theme.palette.primary.main,
  margin: '40px 0'
}));

const FirstOnBoardingBoxLabel = styled(Typography)(({ theme }) => ({
  fontSize: 20,
  fontWeight: 800,
  color: theme.palette.primary.main,
  margin: '0 auto 20px'
}));

const FirstOnBoardingOutlinedBox = styled(StyledContainer)(({ theme }) => ({
  border: `2px solid ${theme.palette.primary.main}`,
  borderRadius: '16px',
  cursor: 'pointer'
}));

const FirstOnBoardingSelectContainer = styled(StyledContainer)(() => ({
  display: 'grid',
  gridTemplateColumns: 'auto 250px',
  alignItems: 'center',

  '& .MuiButtonBase-root': { borderRadius: 0 },
  '& .MuiBox-root': { gap: 0, padding: 0 }
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
  gap: '24px',
  position: 'absolute',
  marginLeft: '850px'
});

export {
  FirstOnBoardingTitle,
  FirstOnBoardingBoxLabel,
  FirstOnBoardingOutlinedBox,
  FirstOnBoardingSelectContainer,
  OnBoardingDocsLink,
  OnBoardingStepperContainer,
  OnBoardingAdditionalContainer
};
