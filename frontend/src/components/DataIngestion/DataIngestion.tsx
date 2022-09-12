import React from 'react';
import { Box } from '@mui/material';
import useDataIngestion from '../../hooks/useDataIngestion';
import DiagramLine from '../DiagramLine';
import {
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledTypographyTitle
} from './DataIngestion.style';
import { Loader } from '../Loader';

// @TODO move this to be calculated
const DIAGRAM_HEIGHT = '294px';

export const DataIngestion = (): JSX.Element => {
  const { graphData, isLoading } = useDataIngestion();

  return (
    <StyledFlexContent>
      <Box>
        <StyledFlexWrapper>
          <StyledTypographyTitle>Prediction Data Status</StyledTypographyTitle>
        </StyledFlexWrapper>
        <StyledDiagramWrapper>
          {isLoading ? <Loader sx={{ height: DIAGRAM_HEIGHT }} /> : <DiagramLine data={graphData} />}
        </StyledDiagramWrapper>
      </Box>
    </StyledFlexContent>
  );
};
