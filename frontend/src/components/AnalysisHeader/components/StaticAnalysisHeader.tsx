import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import { Box } from '@mui/system';

import ModelSelect from './ModelSelect';

interface StaticAnalysisHeaderProps {
  model: ModelManagmentSchema;
  onOpenModelsMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const StaticAnalysisHeader = ({ model, onOpenModelsMenu }: StaticAnalysisHeaderProps) => (
  <Box sx={{ py: '11px', flexGrow: 1 }}>
    <ModelSelect model={model} onOpen={onOpenModelsMenu} size="medium" />
  </Box>
);

export default StaticAnalysisHeader;
