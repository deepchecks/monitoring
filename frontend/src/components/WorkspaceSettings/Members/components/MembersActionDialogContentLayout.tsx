import React from 'react';

import { Box } from '@mui/material';

interface MembersActionDialogContentLayoutProps {
  children: React.ReactNode;
}

export const MembersActionDialogContentLayout = ({ children }: MembersActionDialogContentLayoutProps) => (
  <Box margin="16px 0 50px 0">{children}</Box>
);
