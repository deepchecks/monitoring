import React, { ReactNode, PropsWithChildren } from 'react';

import { styled, Box, Stack, Typography, BoxProps } from '@mui/material';
import { InfoLink } from 'components/InfoLink';

interface AnalysisChartItemProps extends BoxProps {
  title: string;
  docsLink?: string | null;
  subtitle: string;
  headerChildren?: ReactNode;
}

export function AnalysisChartItem({
  children,
  headerChildren,
  subtitle,
  sx,
  title,
  docsLink
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
          {docsLink && (
            <StyledSubTitle>
              <InfoLink docsLink={docsLink}></InfoLink>
            </StyledSubTitle>
          )}
        </Box>
        {headerChildren}
      </Stack>
      {children}
    </StyledAnalysisChartItem>
  );
}

const StyledAnalysisChartItem = styled(Box)({
  padding: '16px 40px',
  borderRadius: '10px',
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',

  '& .legend_icon': {
    width: 22,
    height: 22,
    marginRight: '10px'
  }
});

const StyledTitle = styled(Typography)({
  fontSize: 18,
  fontWeight: 500,
  lineHeight: 1.6,
  letterSpacing: '0.15px'
});

const StyledSubTitle = styled(Typography)({
  fontSize: 12,
  lineHeight: 1.7,
  letterSpacing: '0.1px',
  display: 'inline-block'
});
