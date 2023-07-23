import { Box, styled, Typography } from '@mui/material';

export const StyledScoreContainer = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -60%)'
});

const StyledScoreBase = styled(Typography)({
  fontWeight: 600,
  textAlign: 'center'
});

export const StyledTitle = styled(StyledScoreBase)(({ theme }) => ({
  fontSize: 14,
  color: theme.palette.grey[500],
  marginBottom: '10px'
}));

export const StyledValue = styled(StyledScoreBase)(({ theme }) => ({
  fontSize: 32,
  color: theme.palette.grey[600]
}));
