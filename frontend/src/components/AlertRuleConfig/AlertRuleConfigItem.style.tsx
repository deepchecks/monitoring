import { alpha, Button, Stack, Typography, styled } from '@mui/material';

const StyledContainer = styled(Stack)(({ theme }) => ({
  position: 'relative',
  borderRadius: '10px',
  boxShadow: ' 0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
  lineHeight: '34px',
  outline: '6px solid transparent',

  '&:hover': {
    transition: 'outline-color .4s',
    outlineColor: theme.palette.primary.contrastText
  }
}));

const StyledHeaderContainer = styled(Stack)({
  flexDirection: 'row',
  height: '83px'
});

interface StyledHeaderProps {
  isHovered: boolean;
  color: string;
}

const StyledHeader = styled(Stack, {
  shouldForwardProp: prop => prop !== 'color' && prop !== 'isHovered'
})<StyledHeaderProps>(({ color, isHovered, theme }) => ({
  padding: '11px 13px',
  flexGrow: 1,
  backgroundColor: isHovered ? alpha(theme.palette.primary.contrastText, 0.4) : alpha(color, 0.1),
  color: isHovered ? theme.palette.primary.main : theme.palette.text.primary,
  transition: 'color .4s',
  borderTopRightRadius: '0.6rem'
}));

const StyledAlertName = styled(Typography)({
  fontWeight: 700,
  fontSize: '20px'
});

const StyledBody = styled(Stack)({
  fontSize: '16px',
  lineHeight: '24px',
  margin: '40px 23px',

  '>*': {
    marginBottom: '16px',

    ':last-of-type': {
      marginBottom: 0
    }
  }
});

const StyledBodyItem = styled(Stack)({
  flexDirection: 'row'
});

const StyledTitle = styled(Typography)({
  fontWeight: 600,
  marginRight: '10px'
});

const StyledValue = styled(Typography)({
  fontWeight: 400
});

const StyledHoverContainer = styled(Stack)({
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexDirection: 'row',
  borderRadius: '10px',
  height: '100px',
  width: '100%',
  position: 'absolute',
  right: '0',
  bottom: '0',
  background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) -12.12%, #FFFFFF 28.76%)'
});

const StyledButton = styled(Button)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '10px',
  padding: '5px'
});

const StyledButtonText = styled(Typography)({
  fontSize: '10px',
  lineHeight: '12px',
  letterSpacing: '0.4px'
});

export {
  StyledAlertName,
  StyledBody,
  StyledBodyItem,
  StyledButton,
  StyledButtonText,
  StyledContainer,
  StyledHeader,
  StyledHeaderContainer,
  StyledHoverContainer,
  StyledTitle,
  StyledValue
};
