import { Box, Stack, SxProps, Typography } from '@mui/material';
import React, { ReactNode } from 'react';

interface AnalysisChartItemProps {
  children: ReactNode;
  headerChildren?: ReactNode;
  subtitle: string;
  sx?: SxProps;
  title: string;
}

export function AnalysisChartItem({ children, headerChildren, subtitle, sx, title }: AnalysisChartItemProps) {
  return (
    <Box
      sx={{
        padding: '16px 40px 30px 40px',
        backgroundColor: theme => theme.palette.common.white,
        borderRadius: '10px',
        '& .legend_icon': {
          width: 22,
          height: 22,
          mr: '10px'
        },
        ...sx
      }}
    >
      <Stack direction="row" pb="16px" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography
            sx={{
              fontWeight: 500,
              fontSize: 18,
              lineHeight: 1.6,
              letterSpacing: '0.15px'
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              lineHeight: 1.7,
              letterSpacing: '0.1px'
            }}
          >
            {subtitle}
          </Typography>
        </Box>
        {headerChildren}
      </Stack>
      {children}
    </Box>
  );
}
