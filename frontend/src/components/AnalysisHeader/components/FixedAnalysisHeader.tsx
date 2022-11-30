import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import { Stack, Box } from '@mui/system';

import ModelSelect from './ModelSelect';
import { AnalysisFilters } from 'components/AnalysisFilters/AnalysisFilters';

interface FixedAnalysisHeaderProps {
  model: ModelManagmentSchema;
  open: boolean;
  onOpenModelsMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const FixedAnalysisHeader = ({ model, open, onOpenModelsMenu }: FixedAnalysisHeaderProps) => (
  <Stack
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 10,
      width: 1,
      height: 75,
      padding: '1px 17px 1px 255px',
      background: theme => theme.palette.grey[100],
      transition: 'all 0.35s ease-in-out',
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
  </Stack>
);

export default FixedAnalysisHeader;
