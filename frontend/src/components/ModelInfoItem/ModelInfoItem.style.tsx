import { styled, Stack, Typography, Button, IconButton } from '@mui/material';

export const StyledModelInfoItemContainer = styled(Stack)({
  position: 'relative',
  borderRadius: '16px',
  boxShadow: ' 0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
  fontSize: '16px',
  fontWeight: 400,
  lineHeight: '150%',
  outline: '6px solid transparent',
  background: 'white'
});

export const StyledModelInfoItemHeader = styled(Stack)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  color: theme.palette.text.primary,
  height: '83px',
  padding: '12px 20px',
  borderRadius: '16px 16px 0 0'
}));

export const StyledModelInfoItemFooter = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  justifyContent: 'space-between',
  backgroundColor: theme.palette.grey[200],
  color: theme.palette.text.primary,
  height: '53px',
  padding: '12px 20px',
  borderRadius: '0 0 16px 16px'
}));

export const StyledModelInfoItemName = styled(Typography)({
  fontSize: '20px',
  fontWeight: 700,
  lineHeight: '140%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis'
});

interface StyledModelInfoBadgesContainerProps {
  isHovered: boolean;
}

export const StyledModelInfoBadgesContainer = styled(Stack, {
  shouldForwardProp: prop => prop !== 'isHovered'
})<StyledModelInfoBadgesContainerProps>(({ isHovered }) => ({
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  filter: isHovered ? 'blur(5px)' : ''
}));

export const StyledModelInfoBadge = styled(Stack)(({ theme }) => ({
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  minWidth: '50px',
  height: '60px',
  color: theme.palette.info.main,
  background: theme.palette.common.white,
  margin: '0px 8px'
}));

export const StyledFooterItem = styled(Stack)(({ theme }) => ({
  justifyContent: 'center',
  height: '34px',
  color: theme.palette.info.main,
  margin: '0px 8px'
}));

export const StyledModelInfoVersionsTitle = styled(Typography)({
  fontWeight: 600,
  marginBottom: '16px'
});

export const StyledNoVersionsTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.disabled
}));

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
  left: 'calc(50% - 77px)',
  bottom: '74px',
  display: 'flex',
  flexDirection: 'row'
});

export const StyledDeleteModelButton = styled(IconButton)({
  background: 'transparent',
  padding: '4px'
});

export const StyledDeleteModelButtonText = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  fontWeight: 900,
  color: theme.palette.primary.main,
  lineHeight: '12px',
  letterSpacing: '0.4px'
}));
