import React from 'react';

import { Stack, StackProps } from '@mui/material';

interface MembersActionDialogContentLayoutProps extends StackProps {
  children: React.ReactNode;
}

export const MembersActionDialogContentLayout = ({
  children,
  ...otherProps
}: MembersActionDialogContentLayoutProps) => (
  <Stack margin="16px 0 50px 0" {...otherProps} spacing="20px">
    {children}
  </Stack>
);
