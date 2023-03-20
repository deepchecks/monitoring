import { Box, Stack, Typography, styled } from '@mui/material';

interface StyledContainerProps {
  color: string;
}

const StyledContainer = styled(Stack, {
  shouldForwardProp: prop => prop !== 'color'
})<StyledContainerProps>(({ color }) => ({
  alignItems: 'center',
  textAlign: 'center',
  backgroundColor: color,
  borderRadius: '10px 0px 0px 0px'
}));

const StyledIconBox = styled(Box)({
  padding: '19.5px 18px 0',
  height: '45.5px'
});

const StyledTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.common.white,
  fontSize: 10,
  lineHeight: '12px',
  letterSpacing: '0.4px',
  marginTop: '10px'
}));

export { StyledContainer, StyledIconBox, StyledTypography };
