import React from 'react';
import { useTheme } from '@mui/material';

import { paletteOptions } from '../../theme/palette';

import { Container } from '../Container/Container';
import { Image } from '../Image/Image';
import { Text } from '../Text/Text';

export interface SeverityProps {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  number?: number;
  hideInfo?: boolean;
  margin?: string;
  width?: string;
}

export const Severity = ({ severity, number, hideInfo, margin = '0', width = 'auto' }: SeverityProps) => {
  const theme = useTheme();

  const purpleIcon = require('../../assets/severity/purple.svg').default;
  const lowIcon = require('../../assets/severity/low.svg').default;
  const mediumIcon = require('../../assets/severity/medium.svg').default;
  const highIcon = require('../../assets/severity/high.svg').default;
  const criticalIcon = require('../../assets/severity/critical.svg').default;

  const showSeverity = severity && !hideInfo;

  const severityLevel = () => {
    switch (severity) {
      case 'low':
        return {
          icon: lowIcon,
          color: paletteOptions.severity?.low,
          alt: 'low level'
        };
      case 'medium':
        return {
          icon: mediumIcon,
          color: paletteOptions.severity?.medium,
          alt: 'medium level'
        };
      case 'high':
        return {
          icon: highIcon,
          color: paletteOptions.severity?.high,
          alt: 'high level'
        };
      case 'critical':
        return {
          icon: criticalIcon,
          color: paletteOptions.severity?.critical,
          alt: 'critical level'
        };
      default:
        return {
          icon: purpleIcon,
          color: theme.palette.primary.main,
          alt: 'primary'
        };
    }
  };

  return (
    <Container flexDirection="row" gap="0" width={width} margin={margin}>
      <Image src={severityLevel().icon} alt={severityLevel().alt} width="36px" height="36px" />
      {showSeverity && (
        <Container margin={'0'} gap={'0'} marginTop={'-16px'}>
          <Text text={number ? number.toString() : '#'} color={severityLevel().color} type="h2" fontWeight={900} />
          <Text text={severity} color={severityLevel().color} fontWeight={900} textTransform={'capitalize'} />
        </Container>
      )}
    </Container>
  );
};
