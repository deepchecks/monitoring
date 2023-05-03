import { Box, Link, styled, Typography } from '@mui/material';

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

const OnBoardingSnippetContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  borderRadius: 16,
  border: `1px solid ${theme.palette.grey[400]}`,
  background: theme.palette.grey[200],
  padding: '24px',
  margin: '24px 0 18px',
  whiteSpace: 'pre-line'
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
  margin: '44px auto 0 0',
  '& .MuiSvgIcon-root': {
    width: '32px',
    height: '32px',
    marginRight: 4
  },

  '& .MuiStepContent-root, .MuiStepConnector-line': { borderColor: theme.palette.primary.main },
  '& .MuiStepConnector-root, .MuiStepContent-root': { marginLeft: 16 },
  '& .MuiStepLabel-label': { fontWeight: 700, color: theme.palette.grey[500] },
  '& .Mui-disabled': { fontWeight: 500 }
}));

export {
  FirstOnBoardingTitle,
  FirstOnBoardingBoxLabel,
  OnBoardingSnippetContainer,
  OnBoardingDocsLink,
  OnBoardingStepperContainer
};
