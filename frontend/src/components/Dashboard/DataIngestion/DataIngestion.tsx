import React, { useState } from 'react';
import mixpanel from 'mixpanel-browser';
import { TimeUnit } from 'chart.js';

import useStatsTime from 'hooks/useStatsTime';
import useDataIngestion from 'hooks/useDataIngestion';

import { MenuItem } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';
import DiagramTutorialTooltip from 'components/DiagramTutorialTooltip';
import { Loader } from 'components/Loader';

import {
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledLoaderBox,
  StyledSelect,
  StyledTypographyTitle
} from './DataIngestion.style';

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
    <StyledFlexContent>
      <StyledFlexWrapper>
        <StyledTypographyTitle>Prediction Data Status</StyledTypographyTitle>
      </StyledFlexWrapper>
      {isLoading ? (
        <StyledLoaderBox>
          <Loader sx={{ mt: '150px' }} />
        </StyledLoaderBox>
      ) : (
        <StyledDiagramWrapper>
          <DiagramTutorialTooltip>
            <DiagramLine data={graphData} minTimeUnit={minTimeUnit} timeFreq={timeValue} height={{ lg: 210, xl: 392 }}>
              <StyledSelect
                value={currentTime.value.toString()}
                onChange={e => handleTime(e.target.value)}
                size="small"
              >
                {timeOptions.map(({ label, value }) => (
                  <MenuItem value={value.toString()} key={label}>
                    {label}
                  </MenuItem>
                ))}
              </StyledSelect>
            </DiagramLine>
          </DiagramTutorialTooltip>
        </StyledDiagramWrapper>
      )}
    </StyledFlexContent>
  );
};
