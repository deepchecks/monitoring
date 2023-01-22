import React, { useMemo } from 'react';

import { Stack, styled, Tooltip, Typography } from '@mui/material';

import ModelIcon from './ModelIcon';

import { ArrowDropDown } from 'assets/icon/icon';

import { ModelManagmentSchema } from 'api/generated';

interface ModelSelectProps {
  model: ModelManagmentSchema;
  onOpen: (event: React.MouseEvent<HTMLDivElement>) => void;
  size: 'small' | 'medium';
}

const sizeMap = {
  medium: {
    arrow: {
      width: 32,
      height: 32
    },
    variant: 'h3',
    padding: '10px 0 10px 0',
    xl: {
      textWidth: 'max-content'
    },
    lg: {
      textWidth: 'max-content'
    }
  },
  small: {
    arrow: {
      width: 23,
      height: 23
    },
    variant: 'h5',
    padding: '10px 0 10px 0',
    xl: {
      textWidth: 'max-content'
    },
    lg: {
      textWidth: '150px'
    }
  }
} as const;

const ModelSelect = ({ model, onOpen, size }: ModelSelectProps) => {
  const taskType = useMemo(
    () =>
      typeof model?.task_type === 'string' &&
      (model?.task_type?.toLowerCase().includes('vision')
        ? 'Visual'
        : model?.task_type?.toLowerCase().includes('regression') ||
          model?.task_type?.toLowerCase().includes('multiclass') ||
          model?.task_type?.toLowerCase().includes('binary')
        ? 'Tabular'
        : 'NLP'),
    [model]
  );

  return (
    <StyledSelectWrapper direction="row" alignItems="center" sx={{ padding: sizeMap[size].padding }} onClick={onOpen}>
      <Tooltip title={`${taskType} Model`} arrow>
        {ModelIcon(taskType, sizeMap[size].arrow.width, sizeMap[size].arrow.height)}
      </Tooltip>
      <StyledModelName
        variant={sizeMap[size].variant}
        noWrap={true}
        sx={{
          width: sizeMap[size].xl.textWidth,
          '@media (max-width: 1536px)': {
            width: sizeMap[size].lg.textWidth
          }
        }}
      >
        {model.name} Analysis
      </StyledModelName>
      <ArrowDropDown />
    </StyledSelectWrapper>
  );
};

export default ModelSelect;

const StyledSelectWrapper = styled(Stack)({
  width: 'max-content',
  cursor: 'pointer'
});

const StyledModelName = styled(Typography)({
  marginLeft: '11px',
  minWidth: '100px'
});
