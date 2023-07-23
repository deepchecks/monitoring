import React from 'react';

import { Tooltip, useTheme } from '@mui/material';
import { Warning } from '@mui/icons-material';

import { StyledText } from '../../..';
import { Container } from '../Container';

export interface ToolTipProps {
  text: string;
  error?: boolean;
  link?: { label?: string; href?: string };
  children?: any;
  arrow?: boolean;
  placement?: 'bottom' | 'top' | 'left' | 'right';
}

export const ToolTip = ({ text, error = false, children, arrow = true, placement = 'top', link }: ToolTipProps) => {
  const theme = useTheme();
  const linkColor = theme.palette.primary.main;

  return (
    <Tooltip
      title={
        <Container padding="8px" gap="12px">
          <Container flexDirection="row" padding="0" margin="0 auto">
            {error && <Warning fontSize="small" sx={{ margin: 'auto 0' }} />}
            <StyledText text={text} type="bodyBold" color="white" />
          </Container>
          {link?.label && (
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none', color: linkColor, fontSize: '16px', fontWeight: 900 }}
            >
              {link.label}
            </a>
          )}
        </Container>
      }
      arrow={arrow}
      placement={placement}
    >
      {children}
    </Tooltip>
  );
};
