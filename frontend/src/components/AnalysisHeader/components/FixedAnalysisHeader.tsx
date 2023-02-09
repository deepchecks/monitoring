import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import { Stack, Box } from '@mui/system';

import ModelSelect from './ModelSelect';
import { AnalysisFilters } from 'components/AnalysisFilters/AnalysisFilters';
import { styled } from '@mui/material';

interface FixedAnalysisHeaderProps {
  model: ModelManagmentSchema;
  open: boolean;
  onOpenModelsMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const FixedAnalysisHeader = ({ model, open, onOpenModelsMenu }: FixedAnalysisHeaderProps) => (
  <StyledHeaderWrapper
    sx={{
      transform: open ? 'translateY(0)' : 'translateY(-100%)'
    }}
  >
    <Stack direction="row" alignItems="center" sx={{ transform: 'translateY(12.5px)' }}>
      <Box sx={{ mr: 'auto' }}>
        <ModelSelect model={model} onOpen={onOpenModelsMenu} size="small" />
      </Box>
      <Box sx={{ flex: 1 }}>
        <AnalysisFilters model={model} fixedHeader />
      </Box>
    </Stack>
  </StyledHeaderWrapper>
);

export default FixedAnalysisHeader;

const StyledHeaderWrapper = styled(Stack)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: '236px',
  width: 'calc(100% - 236px)',
  height: 75,
  padding: '1px 17px 1px 19px',
  background: theme.palette.grey[100],
  transition: 'all 0.35s ease-in-out',
  zIndex: 10,
  '@media (max-width: 1536px)': {
    left: '195px',
    width: 'calc(100% - 195px)'
  }
}));
