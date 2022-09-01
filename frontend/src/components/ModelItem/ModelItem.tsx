import React from 'react';
import { Box, Typography } from '@mui/material';
import { StyledAlert, StyledContainer, StyledCounter, StyledModelInfo, StyledTypographyDate } from './ModelItem.style';
import { ModelsInfoSchema } from 'api/generated';

interface ModelItemProps {
  border?: boolean;
  model: ModelsInfoSchema;
}

export function ModelItem({ border = false, model }: ModelItemProps) {
  return (
    <StyledContainer isBorder={border}>
      <StyledModelInfo>
        <Box>
          <Typography variant="subtitle1">{model.name}</Typography>
          <StyledTypographyDate variant="body2">Last data update: July 22, 2022 10am</StyledTypographyDate>
        </Box>
        <StyledAlert>
          <StyledCounter variant="h4">{model.alerts_count}</StyledCounter>
        </StyledAlert>
      </StyledModelInfo>
    </StyledContainer>
  );
}
