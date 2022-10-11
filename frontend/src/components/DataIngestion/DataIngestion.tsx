import { MenuItem } from '@mui/material';
import { StyledSelect } from 'components/MarkedSelect';
import useStatsTime from 'hooks/useStatsTime';
import React from 'react';
import useDataIngestion from '../../hooks/useDataIngestion';
import DiagramLine from '../DiagramLine';
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
  };

  return (
    <StyledFlexContent sx={{ height: 1 }}>
      <StyledFlexWrapper>
        <StyledTypographyTitle>Prediction Data Status</StyledTypographyTitle>
      </StyledFlexWrapper>
      <StyledDiagramWrapper>
        <DiagramLine data={graphData} height={392}>
          <StyledSelect value={currentTime.value.toString()} onChange={ev => handleTime(ev.target.value)} size="small">
            {timeOptions.map(({ label, value }) => (
              <MenuItem value={value.toString()} key={label}>
                {label}
              </MenuItem>
            ))}
          </StyledSelect>
        </DiagramLine>
      </StyledDiagramWrapper>
    </StyledFlexContent>
  );
};
