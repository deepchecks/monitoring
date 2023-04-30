import React from 'react';

import { Link, Typography, Stack, styled } from '@mui/material';

import { InfoIconFilled } from 'assets/icon/icon';
import { theme } from 'components/lib/theme';

interface MonitorInfoLinkProps {
  docsLink: string;
}

export const MonitorInfoLink = ({ docsLink }: MonitorInfoLinkProps) => (
  <StyledLink href={docsLink} target="_blank" rel="noreferrer">
    <StyledContent>
      <InfoIconFilled />
      <StyledTypography>Get more info</StyledTypography>
    </StyledContent>
  </StyledLink>
);

const StyledLink = styled(Link)({
  color: theme.palette.primary.main,
  textDecoration: 'none',
  transition: 'opacity 0.3s ease',

  '&:hover': {
    opacity: 0.7
  }
});

const StyledContent = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: '11.3px'
});

const StyledTypography = styled(Typography)({
  fontWeight: 600,
  fontSize: '12px',
  lineHeight: '15px',
  marginLeft: '7.3px'
});
