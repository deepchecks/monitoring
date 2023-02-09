import { styled, Stack, Typography, Button, IconButton } from '@mui/material';

import { colors } from 'theme/colors';

export const StyledModelInfoItemContainer = styled(Stack)({
  position: 'relative',
  borderRadius: '10px',
  boxShadow: ' 0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
  fontSize: '16px',
  fontWeight: 400,
  lineHeight: '150%',
  outline: '6px solid transparent',
  paddingBottom: '10px'
});

export const StyledModelInfoItemHeader = styled(Stack)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  color: theme.palette.text.primary,
  height: '83px',
  padding: '12px 20px'
}));

export const StyledModelInfoItemName = styled(Typography)({
  fontSize: '20px',
  fontWeight: 700,
  lineHeight: '140%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis'
});

export const StyledModelInfoBadge = styled(Stack)({
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
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

export const StyledHoverButtonContainer = styled(Stack)({
  borderRadius: '10px',
  position: 'absolute',
  display: 'flex',
  flexDirection: 'row'
});

export const StyledDeleteModelButton = styled(IconButton)({
  background: 'transparent',
  padding: '4px'
});

export const StyledDeleteModelButtonText = styled(Typography)({
  fontSize: '10px',
  lineHeight: '12px',
  letterSpacing: '0.4px'
});
