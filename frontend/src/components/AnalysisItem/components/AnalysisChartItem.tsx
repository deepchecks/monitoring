import React, { ReactNode, PropsWithChildren } from 'react';

import { styled, Box, Stack, SxProps, Typography } from '@mui/material';

interface AnalysisChartItemProps {
  title: string;
  subtitle: string;
  headerChildren?: ReactNode;
  sx?: SxProps;
}

export function AnalysisChartItem({
  children,
  headerChildren,
  subtitle,
  sx,
  title
}: PropsWithChildren<AnalysisChartItemProps>) {
  return (
    <StyledAnalysisChartItem
      sx={{
        ...sx
      }}
    >
      <Stack direction="row" pb="16px" justifyContent="space-between" alignItems="center">
        <Box>
          <StyledTitle>{title}</StyledTitle>
          <StyledSubTitle>{subtitle}</StyledSubTitle>
        </Box>
        {headerChildren}
      </Stack>
      {children}
    </StyledAnalysisChartItem>
  );
}

const StyledAnalysisChartItem = styled(Box)(({ theme }) => ({
  minHeight: '527px',
  padding: '16px 40px 0px 40px',
  backgroundColor: theme.palette.common.white,
  borderRadius: '10px',

  '& .legend_icon': {
    width: 22,
    height: 22,
    marginRight: '10px'
  }
}));

const StyledTitle = styled(Typography)({
  fontSize: 18,
  fontWeight: 500,
  lineHeight: 1.6,
  letterSpacing: '0.15px'
});

const StyledSubTitle = styled(Typography)({
  fontSize: 12,
  lineHeight: 1.7,
  letterSpacing: '0.1px'
});
