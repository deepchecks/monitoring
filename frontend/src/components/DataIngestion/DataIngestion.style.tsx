import { Box, Select, styled, Typography } from '@mui/material';

export const StyledFlexContent = styled(Box)(({ theme }) => ({
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
  borderRadius: '10px',
  borderLeft: `8px solid ${theme.palette.primary.light}`
}));

export const StyledTypographyTitle = styled(Typography)({
  color: '#3A474E',
  fontWeight: 500,
  fontSize: 18,
  lineHeight: '32px',
  textAlign: 'left'
});

export const StyledFlexWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  padding: '16px 20px 16px',
  justifyContent: 'space-between',
  marginBottom: '6px'
});

export const StyledDiagramWrapper = styled(Box)({
  padding: '0 40px 16px'
});

export const StyledSelect = styled(Select)(({ theme }) => ({
  marginTop: '40px',
  minWidth: 150,
  alignSelf: 'end',
  '& .MuiSelect-icon': {
    '& + .MuiOutlinedInput-notchedOutline': {
      border: `1px solid ${theme.palette.grey[50]}`
    }
  }
}));

export const StyledFooter = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%'
});

export const StyledGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  width: 300
});

export const StyledModel = styled(Box)({
  display: 'flex',
  alignItems: 'center'
});

interface StyledGraphColorProps {
  graphColor: string;
}

export const StyledGraphColor = styled(Box)<StyledGraphColorProps>(({ graphColor }) => ({
  width: 9,
  height: 9,
  borderRadius: '3px',
  backgroundColor: graphColor,
  marginRight: '6px'
}));
