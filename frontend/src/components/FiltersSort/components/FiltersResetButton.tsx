import React from 'react';

import { Stack, Button, Divider, styled } from '@mui/material';

import { CloseIcon } from 'assets/icon/icon';

import { colors } from 'theme/colors';

interface FiltersResetButtonProps {
  title?: string;
  handleReset: () => void;
  isLoading: boolean;
  divider?: boolean;
}

export const FiltersResetButton = ({
  title = 'Reset',
  handleReset,
  isLoading,
  divider = true
}: FiltersResetButtonProps) => (
  <Stack direction="row" spacing="11px">
    <StyledButton variant="text" startIcon={<CloseIcon />} onClick={handleReset} disabled={isLoading}>
      {title}
    </StyledButton>
    {divider && <StyledResetDivider orientation="vertical" flexItem />}
  </Stack>
);

const StyledButton = styled(Button)({
  fontWeight: 600,
  fontSize: '14px',
  minHeight: '36px',
  borderRadius: '10px',
  color: colors.neutral.lightText,
  paddingRight: 0,

  '& svg': {
    width: '17px',
    height: '17px',
    fill: colors.neutral.lightText
  },

  '&:hover': {
    background: 'transparent',
    opacity: 0.6
  }
});

const StyledResetDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[300],
  alignSelf: 'center',
  height: 24
}));
