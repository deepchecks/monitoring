import React, { useState } from 'react';
import mixpanel from 'mixpanel-browser';
import { TimeUnit } from 'chart.js';

import useStatsTime from 'hooks/useStatsTime';
import useDataIngestion from 'hooks/useDataIngestion';

import { MenuItem } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import DiagramTutorialTooltip from 'components/DiagramTutorialTooltip';
import { Loader } from 'components/Loader';

import { StyledContainer, StyledHeader, StyledLoaderBox, StyledSelect, StyledTitle } from './DataIngestion.style';

interface DataIngestionProps {
  modelId: number | null;
}

export const DataIngestion = ({ modelId }: DataIngestionProps) => {
  const { graphData, isLoading } = useDataIngestion(modelId);
  const [currentTime, setCurrentTime, timeOptions] = useStatsTime();

  const [minTimeUnit, setMinTimeUnit] = useState<TimeUnit>('day');
  const [timeValue, setTimeValue] = useState(86400);

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

    mixpanel.track('Change of time filter for Prediction Data status', {
      'Filter value': newTimeValue
    });
  };

  return (
    <StyledContainer>
      <StyledHeader>
        <StyledTitle>Prediction Data Status</StyledTitle>
        <StyledSelect value={currentTime.value.toString()} onChange={e => handleTime(e.target.value)} size="small">
          {timeOptions.map(({ label, value }) => (
            <MenuItem value={value.toString()} key={label}>
              {label}
            </MenuItem>
          ))}
        </StyledSelect>
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
            height={{ lg: 180, xl: 415 }}
          ></DiagramLine>
        </DiagramTutorialTooltip>
      )}
    </StyledContainer>
  );
};
