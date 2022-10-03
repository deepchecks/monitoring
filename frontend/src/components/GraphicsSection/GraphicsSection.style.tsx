import { Box, Divider, Menu, MenuItem, Select, styled, Typography } from '@mui/material';
import { Arrow } from '../../assets/icon/icon';

export const StyledFlexContent = styled(Box)({
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
  paddingBottom: '30px',
  borderRadius: '10px',
  height: '100%'
});

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
  padding: '16px 20px 0',
  justifyContent: 'space-between',
  marginBottom: '6px'
});

export const StyledDiagramWrapper = styled(Box)({
  padding: '0 20px'
});

export const StyledMenuItem = styled(MenuItem)({
  minWidth: 244,
  padding: '12px',
  position: 'relative'
});

export const StyledSelect = styled(Select)(({ theme }) => ({
  marginTop: '40px',
  minWidth: 150,
  '& .MuiSelect-icon': {
    '& + .MuiOutlinedInput-notchedOutline': {
      border: `1px solid ${theme.palette.grey[50]}`
    }
  }
}));

export const StyledRootMenu = styled(Menu)({
  marginTop: '9px',
  '& .MuiPaper-root': {
    overflow: 'visible'
  }
});

export const StyledArrow = styled(Arrow)(({ theme }) => ({
  fill: theme.palette.text.disabled
}));

export const StyledInfo = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  padding: '0 20px',
  height: 40,
  marginBottom: '7px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
});

export const StyledDivider = styled(Divider)({
  margin: '4px 6px',
  height: '10px'
});
