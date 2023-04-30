import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { styled, Stack, StackProps } from '@mui/material';

import { AnalysisGroupByInfoItem } from './AnalysisGroupByInfoItem';

import { ClassOrFeature } from '../AnalysisGroupBy.types';

import { theme } from 'components/lib/theme';

interface AnalysisGroupByInfoProps extends StackProps {
  startTime: string;
  endTime: string;
  checkName: string;
  modelName: string;
  classOrFeature: ClassOrFeature | null;
}

dayjs.extend(localizedFormat);

const showDate = (date: string) => dayjs(date).format('L LT');

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
  borderTop: `1px dashed ${theme.palette.grey[300]}`,
  borderBottom: `1px dashed ${theme.palette.grey[300]}`
});
