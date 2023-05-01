import { Box, IconButton, Modal, Stack, styled, Typography } from '@mui/material';
import { theme } from 'components/lib/theme';

export const StyledModal = styled(Modal)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
});

export const StyledModalContent = styled(Box)({
  position: 'relative',
  height: '738px',
  width: '1200px',
  background: theme.palette.common.white,
  padding: '40px 32px 0',
  borderRadius: '20px'
});

export const StyledModalTitle = styled(Stack)({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'bottom',
  marginBottom: '30px',
  fontSize: '24px'
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
  position: 'absolute',
  top: '44px',
  right: '32px',
  width: '36px',
  height: '36px',
  background: 'transparent'
});
