import React, { PropsWithChildren } from 'react';

import { styled, Box, Typography, BoxProps } from '@mui/material';

interface GraphLayoutProps extends BoxProps {
  checkPerSegment?: boolean;
  title?: string;
}

export const GraphLayout = ({ title, checkPerSegment, children, ...props }: PropsWithChildren<GraphLayoutProps>) => (
  <StyledContainer {...props}>
    <StyledTitle sx={{ marginBottom: checkPerSegment ? '24px' : 0 }}>{title}</StyledTitle>
    <Box>{children}</Box>
  </StyledContainer>
);

const StyledContainer = styled(Box)({
  padding: '20px 40px',
  borderRadius: '16px',
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
  background: 'white'
});

const StyledTitle = styled(Typography)({
  fontWeight: 500,
  fontSize: '18px',
  lineHeight: '160%',
  letterSpacing: '0.15px'
});
