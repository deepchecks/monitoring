import { alpha, Box, Divider, IconButton, styled, Typography } from '@mui/material';
import { Criticality } from '../../helpers/types/alert';

export const StyledMainWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  borderRadius: '10px',
  boxShadow: '0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
  height: 100,
  position: 'relative',
  ':hover': {
    backgroundColor: theme.palette.primary.light,
    cursor: 'pointer',
    outline: `6px solid ${theme.palette.primary.contrastText}`
  }
}));

interface StyledCriticalityProps {
  criticality: Criticality;
}

export const StyledCriticality = styled(Box, {
  shouldForwardProp: prop => prop !== 'criticality'
})<StyledCriticalityProps>(({ criticality, theme }) => {
  const getColor = (filed: Criticality) => {
    if (filed === 'low') {
      return theme.palette.error.contrastText;
    }

    if (filed === 'mid') {
      return theme.palette.error.light;
    }

    if (filed === 'high') {
      return theme.palette.error.dark;
    }

    if (filed === 'critical') {
      return theme.palette.error.main;
    }
  };

  return {
    height: '100%',
    backgroundColor: getColor(criticality),
    borderLeft: `5px solid ${alpha(theme.palette.common.white, 0.4)}`,
    minWidth: 80,
    padding: '22px 11px 20px 11px',
    textAlign: 'center',
    borderRadius: '10px 0px 0px 10px',
    color: theme.palette.common.white
  };
});

export const StyledDescription = styled(Box)({
  padding: '22px 90px 22px 30px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minWidth: 290
});

export const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[300],
  margin: '14px 0',
  borderStyle: 'dashed'
}));

export const StyledInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '31px 0',
  width: '100%',
  marginLeft: '16px',
  height: '100%'
});

export const StyledProperty = styled(Box)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minWidth: 200
});

export const StyledTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: 12,
  lineHeight: '140%',
  color: theme.palette.text.disabled,
  textTransform: 'uppercase'
}));

export const StyledBlur = styled(Box)({
  position: 'absolute',
  right: 0,
  top: 0,
  height: '100%',
  width: 262,
  background: 'linear-gradient(90deg, rgba(241, 233, 254, 0) -12.12%, #F1E9FE 28.76%)',
  borderRadius: '10px',
  padding: '20px 25px  28px 87px',
  display: 'flex',
  justifyContent: 'space-between'
});

export const StyledIconButton = styled(IconButton)({
  backgroundColor: 'transparent'
});

export const StyledCaption = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  display: 'block'
}));
