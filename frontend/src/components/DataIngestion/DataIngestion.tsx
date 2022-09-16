import React from 'react';
import { Box, MenuItem } from '@mui/material';
import useDataIngestion from '../../hooks/useDataIngestion';
import DiagramLine from '../DiagramLine';
import {
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledFooter,
  StyledTypographyTitle
} from './DataIngestion.style';
import { Loader } from '../Loader';
import { StyledSelect } from 'components/MarkedSelect';
import useStatsTime from 'hooks/useStatsTime';

export const DataIngestion = (): JSX.Element => {
  const { graphData, isLoading } = useDataIngestion();
  const [currentTime, setCurrentTime, timeOptions] = useStatsTime();

  const handleTime = (newTimeValue: any) => {
    if (typeof newTimeValue !== 'string' && typeof newTimeValue !== 'number') return;
    const newTimeIndex = timeOptions.findIndex(time => time.value === +newTimeValue);
    setCurrentTime(timeOptions[newTimeIndex].id);
  };

  return (
    <StyledFlexContent>
      <StyledFlexWrapper>
        <StyledTypographyTitle>Prediction Data Status</StyledTypographyTitle>
      </StyledFlexWrapper>
      <StyledDiagramWrapper>
        <DiagramLine data={graphData} height={392} />
        <StyledSelect value={currentTime.value.toString()} onChange={ev => handleTime(ev.target.value)} size="small">
          {timeOptions.map(({ label, value }) => (
            <MenuItem value={value.toString()} key={label}>
              {label}
            </MenuItem>
          ))}
        </StyledSelect>
      </StyledDiagramWrapper>
    </StyledFlexContent>
  );
};
