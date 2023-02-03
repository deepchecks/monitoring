import { Box, IconButton, Modal, Stack, styled, Typography } from '@mui/material';

export const StyledModal = styled(Modal)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
});

export const StyledModalContent = styled(Box)({
  position: 'relative',
  height: '660px',
  width: '1000px',
  background: '#fff',
  padding: '22px 36px 42px'
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
  position: 'absolute',
  top: '22px',
  right: '12px',
  width: '36px',
  height: '36px',
  background: 'transparent'
});

export const StyledModalList = styled(Box)({
  overflowY: 'auto'
});
