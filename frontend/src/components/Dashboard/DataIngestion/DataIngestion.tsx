import React, { useEffect, useState } from 'react';
import { TimeUnit } from 'chart.js';

import useStatsTime from 'helpers/hooks/useStatsTime';
import useDataIngestion from 'helpers/hooks/useDataIngestion';
import { getStorageItem, setStorageItem, storageKeys } from 'helpers/utils/localStorage';

import { MenuItem } from '@mui/material';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { frequencyValues } from 'helpers/utils/frequency';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import DiagramTutorialTooltip from 'components/DiagramLine/DiagramTutorialTooltip/DiagramTutorialTooltip';
import { Loader } from 'components/Loader';
import { CustomStyledSelect } from 'components/CustomStyledSelect';

import {
  StyledDataIngestionContainer,
  StyledFiltersContainer,
  StyledHeader,
  StyledLoaderBox,
  StyledTitle
} from './DataIngestion.style';

interface DataIngestionProps {
  modelId: number | null;
}

export const DataIngestion = ({ modelId }: DataIngestionProps) => {
  const [selectedPointType, setSelectedPointType] = useState<string>('Samples');
  const [currentTime, setCurrentTime, timeOptions] = useStatsTime();
  const [minTimeUnit, setMinTimeUnit] = useState<TimeUnit>('day');
  const [timeValue, setTimeValue] = useState(frequencyValues.DAY);

  const { graphData, isLoading } = useDataIngestion(modelId, selectedPointType, timeValue);

  const labelsArr = ['Samples', 'Labels', 'Missing Labels'];

  useEffect(() => {
    if (+timeValue <= 3600) {
      setMinTimeUnit('minute');
    } else if (+timeValue <= frequencyValues.DAY) {
      setMinTimeUnit('hour');
    } else {
      setMinTimeUnit('day');
    }
  }, [timeValue]);

  const handleTime = (newTimeValue: unknown) => {
    if (typeof newTimeValue !== 'string' && typeof newTimeValue !== 'number') return;

    const newTimeIndex = timeOptions.findIndex(time => time.value === +newTimeValue);

    setTimeValue(+newTimeValue);

    setCurrentTime(timeOptions[newTimeIndex].id);
    reportEvent(events.dashboardPage.changedTimerFilterProdData, {
      'Filter value': newTimeValue
    });
  };

  useEffect(() => {
    const storageCurrentTime = getStorageItem(storageKeys.dataIngestionTimeFilter);

    if (storageCurrentTime) {
      const parsedCurrentTime = JSON.parse(storageCurrentTime);

      setCurrentTime(parsedCurrentTime.id);
      setTimeValue(parsedCurrentTime.value);
    }
  }, []);

  useEffect(() => setStorageItem(storageKeys.dataIngestionTimeFilter, JSON.stringify(currentTime)), [currentTime]);

  return (
    <StyledDataIngestionContainer type="card">
      <StyledHeader>
        <StyledTitle>Samples status</StyledTitle>
        <StyledFiltersContainer>
          <CustomStyledSelect
            value={selectedPointType}
            size="small"
            onChange={e => setSelectedPointType(e.target.value as string)}
          >
            {labelsArr.map((val, i) => (
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
          <DiagramLine data={graphData} minTimeUnit={minTimeUnit} timeFreq={timeValue} height={{ lg: 259, xl: 362 }} />
        </DiagramTutorialTooltip>
      )}
    </StyledDataIngestionContainer>
  );
};
