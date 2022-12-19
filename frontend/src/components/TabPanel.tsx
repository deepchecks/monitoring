import React, { PropsWithChildren } from 'react';

import { Box } from '@mui/material';

interface TabPanelProps {
  index: number;
  value: number;
}

export const TabPanel = ({ children, value, index, ...props }: PropsWithChildren<TabPanelProps>) => (
  <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...props}>
    {value === index && <Box>{children}</Box>}
  </div>
);
