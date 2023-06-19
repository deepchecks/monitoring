import React from 'react';

import { Tooltip } from '@mui/material';
import { Warning } from '@mui/icons-material';

import { StyledText } from '../../..';
import { Container } from '../Container';

export interface ToolTipProps {
  text: string;
  error?: boolean;
  children?: any;
  arrow?: boolean;
  placement?: 'bottom' | 'top' | 'left' | 'right';
}

export const ToolTip = ({ text, error = false, children, arrow = true, placement = 'top' }: ToolTipProps) => (
  <Tooltip
    title={
      <Container flexDirection="row" padding="8px" margin="0 auto">
        {error && <Warning fontSize="small" sx={{ margin: 'auto 0' }} />}
        <StyledText text={text} type="bodyBold" color="white" />
      </Container>
    }
    arrow={arrow}
    placement={placement}
  >
    {children}
  </Tooltip>
);
