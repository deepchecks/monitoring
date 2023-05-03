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
  margin: '24px 0 18px'
}));

const OnBoardingDocsLink = styled(Link)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.primary.main,
  float: 'right',
  textDecoration: 'none',
  cursor: 'pointer'
}));

export { FirstOnBoardingTitle, FirstOnBoardingBoxLabel, OnBoardingSnippetContainer, OnBoardingDocsLink };
