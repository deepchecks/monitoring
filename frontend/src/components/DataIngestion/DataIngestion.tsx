import React, { useState } from 'react';
import mixpanel from 'mixpanel-browser';

import useStatsTime from 'hooks/useStatsTime';
import useDataIngestion from '../../hooks/useDataIngestion';

import { Box, MenuItem } from '@mui/material';

import { StyledSelect } from 'components/MarkedSelect/MarkedSelect';
import DiagramLine from '../DiagramLine/DiagramLine';
import DiagramTutorialTooltip from 'components/DiagramTutorialTooltip';

import {
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledTypographyTitle
} from './DataIngestion.style';
import { Loader } from 'components/Loader';
import { TimeUnit } from 'chart.js';

interface DataIngestionProps {
  modelId: number | null;
}

export const DataIngestion = ({ modelId }: DataIngestionProps): JSX.Element => {
  const { graphData, isLoading } = useDataIngestion(modelId);
  const [currentTime, setCurrentTime, timeOptions] = useStatsTime();
  const [minTimeUnit, setMinTimeUnit] = useState<TimeUnit>('day');
  const [timeValue, setTimeValue] = useState<number>(86400);

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
    <StyledFlexContent sx={{ height: 1 }}>
      <StyledFlexWrapper>
        <StyledTypographyTitle>Prediction Data Status</StyledTypographyTitle>
      </StyledFlexWrapper>
      {isLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Loader sx={{ mt: '150px' }} />
        </Box>
      ) : (
        <StyledDiagramWrapper>
          <DiagramTutorialTooltip>
            <DiagramLine data={graphData} height={392} minTimeUnit={minTimeUnit} timeFreq={timeValue}>
              <StyledSelect
                value={currentTime.value.toString()}
                onChange={ev => handleTime(ev.target.value)}
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
