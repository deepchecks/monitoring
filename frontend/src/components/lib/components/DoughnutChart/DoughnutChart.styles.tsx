import { Box, styled } from '@mui/material';

export const StyledScoresBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: '34px',
  justifyContent: 'center',
  margin: '16px auto',
  textAlign: 'center',

  '.MuiTypography-root': { color: theme.palette.grey[300] }
}));

export const StyledDoughnutChartContainer = styled(Box)({
  position: 'relative'
});

export const doughnutChartImageStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0px',
  top: '200px',
  zIndex: '-1',
  cursor: 'pointer'
};
