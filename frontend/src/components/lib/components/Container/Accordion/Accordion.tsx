import React, { ReactNode } from 'react';

import { AccordionDetails, AccordionSummary, Accordion as MuiAccordion, Stack, useTheme } from '@mui/material';
import { ExpandMoreOutlined } from '@mui/icons-material';

import { Text } from '../../Text/Text';

export interface AccordionProps {
  title?: string;
  children?: ReactNode | ReactNode[];
  defaultExpanded?: boolean;
}

export const Accordion = ({ title, children, defaultExpanded }: AccordionProps) => {
  const theme = useTheme();

  const grey = theme.palette.grey[300];

  return (
    <Stack sx={{ '.Mui-expanded': { margin: 0, background: 'none' }, '.MuiAccordion-root': { background: 'none' } }}>
      <MuiAccordion
        sx={{ color: grey, boxShadow: 'none', ':before': { background: 'none' } }}
        defaultExpanded={defaultExpanded}
      >
        <AccordionSummary expandIcon={<ExpandMoreOutlined color="info" />} sx={{ padding: '0' }}>
          <Text text={title} overflow="unset" type="bodyBold" />
          <div style={{ background: grey, width: '100%', height: '1px', margin: 'auto 12px' }} />
        </AccordionSummary>
        <AccordionDetails sx={{ padding: '0' }}>{children}</AccordionDetails>
      </MuiAccordion>
    </Stack>
  );
};
