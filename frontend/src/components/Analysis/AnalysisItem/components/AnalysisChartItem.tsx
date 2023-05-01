import React, { ReactNode, PropsWithChildren } from 'react';

import { styled, Box, Stack, Typography, BoxProps } from '@mui/material';

import { InfoLink } from 'components/InfoLink';

import { theme } from 'components/lib/theme';

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
  title,
  docsLink,
  ...props
}: PropsWithChildren<AnalysisChartItemProps>) {
  return (
    <StyledAnalysisChartItem {...props}>
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
  border: `1px solid ${theme.palette.grey.light}`,

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
