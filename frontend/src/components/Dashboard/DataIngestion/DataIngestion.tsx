import React, { useEffect, useState } from 'react';

import { TimeUnit } from 'chart.js';

import { MenuItem } from '@mui/material';

import { Loader } from 'components/base/Loader/Loader';
import DiagramLine from 'components/DiagramLine/DiagramLine';
import { CustomStyledSelect } from 'components/Select/CustomStyledSelect';
import DiagramTutorialTooltip from 'components/DiagramLine/DiagramTutorialTooltip/DiagramTutorialTooltip';

import {
  StyledDataIngestionContainer,
  StyledFiltersContainer,
  StyledHeader,
  StyledLoaderBox,
  StyledTitle
} from './DataIngestion.style';

import useStatsTime from 'helpers/hooks/useStatsTime';
import { frequencyValues } from 'helpers/utils/frequency';
import useDataIngestion from 'helpers/hooks/useDataIngestion';
import { getStorageItem, setStorageItem, storageKeys } from 'helpers/utils/localStorage';
import { useGetAlertsOfAlertRuleApiV1DataIngestionAlertRulesDataIngestionAlertRuleIdAlertsGet } from 'api/generated';

interface DataIngestionProps {
  modelId: number | null;
}

interface StorageCurrentTime {
  id: string;
  label: string;
  value: number;
}

const LABELS_ARR = ['Samples', 'Labels', 'Missing Labels'] as const;
type SelectLabels = typeof LABELS_ARR[number];

export const DataIngestion = ({ modelId }: DataIngestionProps) => {
  const [selectedPointType, setSelectedPointType] = useState<SelectLabels>(LABELS_ARR[0]);
  const [currentTime, setCurrentTime, timeOptions] = useStatsTime();
  const [minTimeUnit, setMinTimeUnit] = useState<TimeUnit>('day');
  const [timeValue, setTimeValue] = useState(frequencyValues.DAY);

  const { graphData, isLoading } = useDataIngestion(modelId, selectedPointType, timeValue);
  const { data } = useGetAlertsOfAlertRuleApiV1DataIngestionAlertRulesDataIngestionAlertRuleIdAlertsGet(Number(12));

  const handleMinTimeUnit = (value: number) => {
    if (value <= frequencyValues.HOUR) {
      setMinTimeUnit('minute');
    } else if (value <= frequencyValues.DAY) {
      setMinTimeUnit('hour');
    } else {
      setMinTimeUnit('day');
    }
  };

  const handleTime = (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') return;

    const newTimeValue = +value;
    const newTimeIndex = timeOptions.findIndex(time => time.value === newTimeValue);

    handleMinTimeUnit(newTimeValue);
    setTimeValue(newTimeValue);
    setCurrentTime(timeOptions[newTimeIndex].id);
  };

  useEffect(() => {
    const storageCurrentTime = getStorageItem(storageKeys.dataIngestionTimeFilter);

    if (storageCurrentTime) {
      const parsedCurrentTime: StorageCurrentTime = JSON.parse(storageCurrentTime);

      setCurrentTime(parsedCurrentTime.id);
      handleMinTimeUnit(parsedCurrentTime.value);
      setTimeValue(parsedCurrentTime.value);
    }
  }, []);

  useEffect(() => setStorageItem(storageKeys.dataIngestionTimeFilter, JSON.stringify(currentTime)), [currentTime]);

  const dataAlerts = Array?.isArray(data) ? data : [];

  return (
    <StyledDataIngestionContainer type="card" minWidth="410px">
      <StyledHeader>
        <StyledTitle>Samples status</StyledTitle>
        <StyledFiltersContainer>
          <CustomStyledSelect
            size="small"
            value={selectedPointType}
            onChange={e => setSelectedPointType(e.target.value as SelectLabels)}
          >
            {LABELS_ARR.map((val, i) => (
              <MenuItem key={i} value={val}>
                # {val}
              </MenuItem>
            ))}
          </CustomStyledSelect>
          <CustomStyledSelect
            value={currentTime.value.toString()}
            onChange={e => handleTime(e.target.value)}
            size="small"
          >
            {timeOptions.map(({ label, value }) => (
              <MenuItem value={value.toString()} key={label}>
                {label}
              </MenuItem>
            ))}
          </CustomStyledSelect>
        </StyledFiltersContainer>
      </StyledHeader>
      {isLoading ? (
        <StyledLoaderBox>
          <Loader sx={{ mt: '150px' }} />
        </StyledLoaderBox>
      ) : (
        <DiagramTutorialTooltip>
          <DiagramLine
            data={graphData}
            timeFreq={timeValue}
            alert_rules={dataAlerts}
            minTimeUnit={minTimeUnit}
            height={{ lg: 259, xl: 362 }}
          />
        </DiagramTutorialTooltip>
      )}
    </StyledDataIngestionContainer>
  );
};
