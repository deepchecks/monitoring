import React from 'react';

import { Stack, Tooltip, Typography } from '@mui/material';

import ModelIcon from './ModelIcon';

import { ArrowDropDown } from 'assets/icon/icon';

import { ModelSchema } from 'api/generated';

interface ModelSelectProps {
  model: ModelSchema;
  onOpen: (event: React.MouseEvent<HTMLDivElement>) => void;
  size: 'small' | 'medium';
}

const sizeMap = {
  medium: {
    arrow: {
      width: 32,
      height: 32
    },
    py: '10px',
    variant: 'h3'
  },
  small: {
    arrow: {
      width: 20,
      height: 20
    },
    py: '10px',
    variant: 'h6'
  }
} as const;

const ModelSelect = ({ model, onOpen, size }: ModelSelectProps) => {
  const taskType =
    typeof model?.task_type === 'string' &&
    (model?.task_type?.toLowerCase().includes('vision')
      ? 'Visual'
      : model?.task_type?.toLowerCase().includes('regression') ||
        model?.task_type?.toLowerCase().includes('multiclass') ||
        model?.task_type?.toLowerCase().includes('binary')
      ? 'Tabular'
      : 'NLP');

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{ py: sizeMap[size].py, width: 'max-content', cursor: 'pointer' }}
      onClick={onOpen}
    >
      <Tooltip title={`${taskType} Model`} arrow>
        {ModelIcon(taskType, sizeMap[size].arrow.width, sizeMap[size].arrow.height)}
      </Tooltip>
      <Typography variant={sizeMap[size].variant} sx={{ mx: '11px', minWidth: 100 }}>
        {model.name} Analysis
      </Typography>
      <ArrowDropDown />
    </Stack>
  );
};

export default ModelSelect;
