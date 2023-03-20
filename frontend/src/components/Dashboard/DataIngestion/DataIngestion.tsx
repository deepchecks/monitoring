import React, { useEffect, useState } from 'react';
import { TimeUnit } from 'chart.js';

import useStatsTime from 'helpers/hooks/useStatsTime';
import useDataIngestion from 'helpers/hooks/useDataIngestion';
import { getStorageItem, setStorageItem, storageKeys } from 'helpers/utils/localStorage';

import { MenuItem } from '@mui/material';

import { events, reportEvent } from 'helpers/services/mixPanel';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import DiagramTutorialTooltip from 'components/DiagramTutorialTooltip';
import { Loader } from 'components/Loader';
import { CustomStyledSelect } from 'components/CustomStyledSelect';

import {
  StyledContainer,
  StyledFiltersContainer,
  StyledHeader,
  StyledLoaderBox,
  StyledTitle
} from './DataIngestion.style';

interface DataIngestionProps {
  modelId: number | null;
}

export const DataIngestion = ({ modelId }: DataIngestionProps) => {
  const { graphData, data, isLoading } = useDataIngestion(modelId);
  const [currentTime, setCurrentTime, timeOptions] = useStatsTime();

  const [minTimeUnit, setMinTimeUnit] = useState<TimeUnit>('day');
  const [timeValue, setTimeValue] = useState(86400);
  const [labelsArr, setLabelsArr] = useState([{ name: '', value: 0 }]);
  const [pointIndex, setPointIndex] = useState(0);

  const modelKey = Number(Object.keys(data)[0]);

  const handleTime = (newTimeValue: unknown) => {
    if (typeof newTimeValue !== 'string' && typeof newTimeValue !== 'number') return;

    const newTimeIndex = timeOptions.findIndex(time => time.value === +newTimeValue);

    setTimeValue(+newTimeValue);

    if (+newTimeValue <= 3600) {
      setMinTimeUnit('minute');
    } else if (+newTimeValue <= 86400) {
      setMinTimeUnit('hour');
    } else {
      setMinTimeUnit('day');
    }

    setCurrentTime(timeOptions[newTimeIndex].id);
    reportEvent(events.dashboardPage.changedTimerFilterProdData, {
      'Filter value': newTimeValue
    });
  };

  useEffect(() => {
    const labelsData = (data as any[])[modelKey] ? (data as any[])[modelKey][pointIndex] : { label_count: 0, count: 0 };
    const loadNewLabels = modelKey && labelsData;

    loadNewLabels &&
      setLabelsArr([
        { name: 'Samples', value: labelsData?.count },
        { name: 'Labels', value: labelsData?.label_count },
        {
          name: 'Missing Labels',
          value: labelsData.count - labelsData?.label_count
        }
      ]);
  }, [modelKey, currentTime]);

  useEffect(() => {
    const storageCurrentTime = getStorageItem(storageKeys.dataIngestionTimeFilter);

    if (storageCurrentTime) {
      const parsedCurrentTime = JSON.parse(storageCurrentTime);

      setCurrentTime(parsedCurrentTime.id);
    }
  }, []);

  useEffect(() => setStorageItem(storageKeys.dataIngestionTimeFilter, JSON.stringify(currentTime)), [currentTime]);

  return (
    <StyledContainer>
      <StyledHeader>
        <StyledTitle>Samples status</StyledTitle>
        <StyledFiltersContainer>
          <CustomStyledSelect value={'Samples'} size="small">
            {labelsArr.map((val, i) => (
              <MenuItem key={i} value={val.name}>
                {val.value} {val.name}
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
            minTimeUnit={minTimeUnit}
            timeFreq={timeValue}
            height={{ lg: 259, xl: 362 }}
            setPointIndex={setPointIndex}
          ></DiagramLine>
        </DiagramTutorialTooltip>
      )}
    </StyledContainer>
  );
};
