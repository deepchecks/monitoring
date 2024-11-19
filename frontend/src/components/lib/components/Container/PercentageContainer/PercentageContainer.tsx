import React from 'react';

import { useTheme, Box } from '@mui/material';

import { Text } from '../../Text/Text';

interface PercentageContainerProps {
  percentage: number;
  amount?: number;
  title?: string;
  border?: boolean;
  chosen?: boolean;
  onClick?: () => void;
}

export const PercentageContainer = (props: PercentageContainerProps) => {
  const { title, amount, percentage, chosen, border, onClick } = props;

  const theme = useTheme();

  const coverageText = `${amount ? `${amount} Samples` : ''} (${Math.round(Number(percentage) * 100)}%)`;
  const textColor = chosen ? theme.palette.primary.main : theme.palette.grey[500];
  const titleTextColor = chosen ? theme.palette.primary.main : theme.palette.grey[600];
  const bgColor = chosen ? theme.palette.primary.main : theme.palette.grey[200];
  const gradientPercentage = `${percentage * 100}%`;
  const gradientColorStops = `${theme.palette.grey[200]} ${gradientPercentage}, ${theme.palette.grey[100]} ${gradientPercentage}`;

  return (
    <Box
      sx={{
        border: border ? `2px solid ${bgColor}` : 'none',
        borderRadius: '8px'
      }}
      data-testid={`PercentageContainer${title}`}
    >
      <Box
        data-testid="percentage-container"
        onClick={onClick && onClick}
        sx={{
          background: `linear-gradient(to right, ${gradientColorStops})`,
          cursor: onClick ? 'pointer' : 'auto',
          maxWidth: 250,
          padding: '12px',
          transform: '0.5s',
          gap: '8px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: border ? '6px' : '8px',

          ':hover': {
            opacity: 0.7
          }
        }}
      >
        <Text text={title} color={titleTextColor} type="bodyBold" fontSize={15} whiteSpace="nowrap" />
        <Text text={coverageText} color={textColor} type="tinyBold" />
      </Box>
    </Box>
  );
};
