import React from 'react';

import { ModelSchema } from 'api/generated';

import { Box } from '@mui/system';

import ModelSelect from './ModelSelect';

interface FixedAnalysisHeaderProps {
  model: ModelSchema;
  open: boolean;
  onOpenModelsMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const FixedAnalysisHeader = ({ model, open, onOpenModelsMenu }: FixedAnalysisHeaderProps) => (
  <Box
    sx={{
      background: theme => theme.palette.grey[100],
      position: 'fixed',
      top: 0,
      left: 0,
      transform: open ? 'translateY(0)' : 'translateY(-100%)',
      width: 1,
      padding: '1px 0 3px 0',
      transition: 'all 0.15s ease-in-out',
      pl: '272px',
      zIndex: 10
    }}
  >
    <Box sx={{ width: 1, height: '56px', m: '0 auto' }}>
      <ModelSelect model={model} onOpen={onOpenModelsMenu} size="small" />
    </Box>
  </Box>
);

export default FixedAnalysisHeader;
