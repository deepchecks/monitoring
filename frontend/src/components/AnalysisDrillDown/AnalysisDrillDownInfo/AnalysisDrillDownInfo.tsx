import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { styled, Stack, StackProps } from '@mui/material';

import { AnalysisDrillDownInfoItem } from './AnalysisDrillDownInfoItem';

import { ClassOrFeature } from '../AnalysisDrillDown.types';

import { theme } from 'components/lib/theme';

interface AnalysisDrillDownInfoProps extends StackProps {
  startTime: string;
  endTime: string;
  checkName: string;
  modelName: string;
  classOrFeature: ClassOrFeature | null;
}

dayjs.extend(localizedFormat);

const showDate = (date: string) => dayjs(date).format('L LT');

export const AnalysisDrillDownInfo = ({
  startTime,
  endTime,
  checkName,
  modelName,
  classOrFeature,
  ...props
}: AnalysisDrillDownInfoProps) => (
  <StyledContainer {...props}>
    <AnalysisDrillDownInfoItem title="Date range" value={`${showDate(startTime)} - ${showDate(endTime)}`} />
    <AnalysisDrillDownInfoItem title="Check" value={checkName} />
    <AnalysisDrillDownInfoItem title="Model" value={modelName} />
    {classOrFeature && <AnalysisDrillDownInfoItem title={classOrFeature.type} value={classOrFeature.value} />}
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
