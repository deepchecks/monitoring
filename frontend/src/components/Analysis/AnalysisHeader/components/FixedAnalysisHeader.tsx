import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import { styled, Stack } from '@mui/material';

import { ModelSelect } from './ModelSelect';
import { AnalysisHeaderOptions } from './AnalysisHeaderOptions';
import { StyledDivider } from '../AnalysisHeader.style';
import { AnalysisFilters } from 'components/Analysis/AnalysisFilters';

interface FixedAnalysisHeaderProps {
  model: ModelManagmentSchema;
  open: boolean;
  onOpenModelsMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const FixedAnalysisHeader = ({ model, open, onOpenModelsMenu }: FixedAnalysisHeaderProps) => (
  <StyledHeaderWrapper isOpen={open}>
    <StyledSelectContainer>
      <ModelSelect model={model} onOpen={onOpenModelsMenu} sx={{ marginRight: '20px' }} />
      <AnalysisHeaderOptions model={model} />
      <StyledDivider orientation="vertical" flexItem sx={{ marginLeft: '18px' }} />
      <AnalysisFilters model={model} fixedHeader sx={{ flexGrow: 1 }} />
    </StyledSelectContainer>
  </StyledHeaderWrapper>
);

interface StyledHeaderWrapperProps {
  isOpen: boolean;
}

const StyledHeaderWrapper = styled(Stack, {
  shouldForwardProp: prop => prop !== 'isOpen'
})<StyledHeaderWrapperProps>(({ isOpen, theme }) => ({
  transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
  position: 'fixed',
  alignItems: 'center',
  flexDirection: 'row',
  top: 0,
  left: '236px',
  width: 'calc(100% - 236px)',
  height: '76px',
  background: theme.palette.grey[100],
  transition: 'all 0.35s ease-in-out',
  zIndex: 10,
  borderBottom: `1px solid ${theme.palette.grey.light}`,

  '@media (max-width: 1200px)': {
    width: '100%',
    flexWrap: 'wrap',
    height: '200px',
    left: '0'
  }
}));

const StyledSelectContainer = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center',
  height: '36px',
  width: '100%',
  margin: '0 38px',

  '@media (max-width: 1200px)': {
    marginTop: '-24px',
    flexWrap: 'wrap',
    height: '200px',

    '& .MuiDivider-root': { borderColor: 'transparent' }
  }
});
