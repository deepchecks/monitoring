import { styled, Stack, Typography, Button, Modal, Box, IconButton } from '@mui/material';

import { colors } from 'theme/colors';

export const StyledModelInfoItemContainer = styled(Stack)({
  position: 'relative',
  width: '428px',
  height: '207px',
  borderRadius: '10px',
  boxShadow: ' 0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
  fontSize: '16px',
  fontWeight: 400,
  lineHeight: '150%',
  outline: '6px solid transparent'
});

export const StyledModelInfoItemHeader = styled(Stack)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  color: theme.palette.text.primary,
  height: '83px',
  padding: '12px 20px'
}));

export const StyledModelInfoItemName = styled(Typography)({
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: '140%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis'
});

export const StyledModelInfoBadge = styled(Stack)({
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '50px',
  height: '60px',
  color: colors.neutral.blue[70],
  background: colors.neutral.white,
  borderRadius: '20px'
});

export const StyledModelInfoVersionsTitle = styled(Typography)({
  fontWeight: 600,
  marginBottom: '16px'
});

export const StyledNoVersionsTitle = styled(Typography)({
  color: colors.neutral.lightText
});

export const StyledVersion = styled(Typography)({
  marginBottom: '16px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
});

export const StyledModelInfoHandleRangeButton = styled(Button)({
  transform: 'translate(-12px, 8px)',
  borderRadius: '4px'
});

export const StyledModal = styled(Modal)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
});

export const StyledModalContent = styled(Box)({
  height: '660px',
  width: '1000px',
  background: '#fff',
  padding: '30px'
});

export const StyledModalTitle = styled(Stack)({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'bottom',
  marginBottom: '30px'
});

export const StyledModalTitleText = styled(Typography)({
  fontWeight: 700,
  fontSize: '24px',
  lineHeight: '140%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
});

export const StyledModalCloseButton = styled(IconButton)({
  width: '26px',
  height: '25px',
  marginLeft: '5px',
  padding: '2px',
  background: 'transparent',
  transform: 'translateY(5px)'
});

export const StyledModalList = styled(Box)({
  overflowY: 'auto',
  height: '350px'
});

export const StyledHoverButtonContainer = styled(Stack)({
  borderRadius: '10px',
  position: 'absolute',
  display: 'block'
});

export const StyledDeleteModelButton = styled(IconButton)({
  background: 'transparent',
  padding: '4px',
  transform: 'translate(2px, 10px)'
});

export const StyledDeleteModelButtonText = styled(Typography)({
  fontSize: '10px',
  lineHeight: '12px',
  letterSpacing: '0.4px'
});
