import React from 'react';

import { ModelSchema } from 'api/generated';

import { Box } from '@mui/system';

import ModelSelect from './ModelSelect';

interface StaticAnalysisHeaderProps {
  model: ModelSchema;
  onOpenModelsMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const StaticAnalysisHeader = ({ model, onOpenModelsMenu }: StaticAnalysisHeaderProps) => (
  <Box sx={{ py: '11px', borderBottom: theme => `1px dashed ${theme.palette.text.disabled}` }}>
    <ModelSelect model={model} onOpen={onOpenModelsMenu} size="medium" />
  </Box>
);

export default StaticAnalysisHeader;
