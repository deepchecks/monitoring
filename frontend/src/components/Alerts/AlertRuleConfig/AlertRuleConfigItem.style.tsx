import { Button, Stack, Typography, styled } from '@mui/material';

const StyledContainer = styled(Stack)(({ theme }) => ({
  position: 'relative',
  borderRadius: '16px',
  lineHeight: '34px',
  background: 'white',
  height: '234px',

  '&:hover': {
    outlineColor: theme.palette.primary.contrastText
  }
}));

const StyledHeaderContainer = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  height: '84px',
  alignItems: 'center',
  borderBottom: `3px solid ${theme.palette.grey[100]}`
}));

const StyledHeader = styled(Stack)(() => ({
  padding: '11px 13px',
  flexGrow: 1,
  transition: 'color .4s',
  borderTopRightRadius: '0.6rem'
}));

const StyledAlertName = styled(Typography)({
  fontWeight: 700,
  fontSize: '20px',
  marginLeft: '-12px',
  lineHeight: '28px',
  width: '210px',
  whiteSpace: 'pre-line',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
});

const StyledBody = styled(Stack)({
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 23px',

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
  borderRadius: '16px',
  height: '120px',
  gap: '16px',
  padding: '24px',
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
  borderRadius: '16px',
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
