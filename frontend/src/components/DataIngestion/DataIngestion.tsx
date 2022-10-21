import React from 'react';
import mixpanel from 'mixpanel-browser';

import useStatsTime from 'hooks/useStatsTime';
import useDataIngestion from '../../hooks/useDataIngestion';

import { MenuItem } from '@mui/material';

import { StyledSelect } from 'components/MarkedSelect';
import DiagramLine from '../DiagramLine';
import DiagramTutorialTooltip from 'components/DiagramTutorialTooltip';

import {
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledTypographyTitle
} from './DataIngestion.style';

interface DataIngestionProps {
  modelId: number | null;
}

export const DataIngestion = ({ modelId }: DataIngestionProps): JSX.Element => {
  const { graphData } = useDataIngestion(modelId);
  const [currentTime, setCurrentTime, timeOptions] = useStatsTime();

  const handleTime = (newTimeValue: unknown) => {
    if (typeof newTimeValue !== 'string' && typeof newTimeValue !== 'number') return;

    const newTimeIndex = timeOptions.findIndex(time => time.value === +newTimeValue);
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
      <StyledDiagramWrapper>
        <DiagramTutorialTooltip>
          <DiagramLine data={graphData} height={392}>
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
    </StyledFlexContent>
  );
};
