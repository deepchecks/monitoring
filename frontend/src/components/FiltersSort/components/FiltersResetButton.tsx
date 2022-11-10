import React from 'react';

import { Stack, Button, Divider, styled } from '@mui/material';

import { Undo } from '../../../assets/icon/icon';

interface FiltersResetButtonProps {
  title?: string;
  handleReset: () => void;
  isLoading: boolean;
  divider?: boolean;
}

const FiltersResetButton = ({ title = 'Reset', handleReset, isLoading, divider = true }: FiltersResetButtonProps) => (
  <Stack direction="row" spacing="11px">
    <Button variant="text" startIcon={<Undo />} onClick={handleReset} disabled={isLoading} sx={{ minHeight: 30 }}>
      {title}
    </Button>
    {divider && <StyledResetDivider orientation="vertical" flexItem />}
  </Stack>
);

const StyledResetDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[300],
  alignSelf: 'center',
  height: 24
}));

export default FiltersResetButton;
