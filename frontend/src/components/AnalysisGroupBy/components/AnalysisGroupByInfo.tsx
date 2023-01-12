import React from 'react';
import dayjs from 'dayjs';

import { styled, Stack, StackProps } from '@mui/material';

import { AnalysisGroupByInfoItem } from './AnalysisGroupByInfoItem';

import { colors } from 'theme/colors';

import { ClassOrFeature } from '../AnalysisGroupBy.types';

interface AnalysisGroupByInfoProps extends StackProps {
  startTime: string;
  endTime: string;
  checkName: string;
  modelName: string;
  classOrFeature: ClassOrFeature | null;
}

const showDate = (date: string) => dayjs(date).format('DD/MM/YY HH:mm');

export const AnalysisGroupByInfo = ({
  startTime,
  endTime,
  checkName,
  modelName,
  classOrFeature,
  ...props
}: AnalysisGroupByInfoProps) => (
  <StyledContainer {...props}>
    <AnalysisGroupByInfoItem title="Date range" value={`${showDate(startTime)} - ${showDate(endTime)}`} />
    <AnalysisGroupByInfoItem title="Check" value={checkName} />
    <AnalysisGroupByInfoItem title="Model" value={modelName} />
    {classOrFeature && <AnalysisGroupByInfoItem title={classOrFeature.type} value={classOrFeature.value} />}
  </StyledContainer>
);

const StyledContainer = styled(Stack)({
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: '37px',
  padding: '20px 0',
  borderTop: `1px dashed ${colors.neutral.grey[300]}`,
  borderBottom: `1px dashed ${colors.neutral.grey[300]}`
});
