import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import { Stack, styled, Typography, StackProps } from '@mui/material';

import { ArrowDropDown } from 'assets/icon/icon';

interface ModelSelectProps extends StackProps {
  model: ModelManagmentSchema;
  onOpen: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const ModelSelect = ({ model, onOpen, ...props }: ModelSelectProps) => (
  <StyledSelectWrapper {...props} onClick={onOpen}>
    <StyledModelName noWrap={true}>{model.name}</StyledModelName>
    <ArrowDropDown />
  </StyledSelectWrapper>
);

const StyledSelectWrapper = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center',
  width: 'max-content',
  cursor: 'pointer',
  padding: '26px 0 26px 0'
});

const StyledModelName = styled(Typography)({
  fontWeight: 700,
  fontSize: '24px',
  height: '26px'
});
