import { Box, Typography } from '@mui/material';
import { ModelsInfoSchema } from 'api/generated';
import { GlobalStateContext } from 'Context';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StyledAlert, StyledContainer, StyledCounter, StyledModelInfo, StyledTypographyDate } from './ModelItem.style';
import dayjs from 'dayjs';

interface ModelItemProps {
  model: ModelsInfoSchema;
}

export function ModelItem({ model }: ModelItemProps) {
  const navigate = useNavigate();
  const { changeAlertFilters } = useContext(GlobalStateContext);

  const linkToAlerts = () => {
    changeAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, models: [model.id] }));
    navigate({ pathname: '/alerts' });
  };

  return (
    <StyledContainer onClick={linkToAlerts}>
      <StyledModelInfo>
        <Box>
          <Typography variant="subtitle1">{model.name}</Typography>
          <StyledTypographyDate variant="body2">
            Last data update: {model.latest_time ? dayjs.unix(model.latest_time).format('MMM. DD, YYYY') : '-'}
          </StyledTypographyDate>
        </Box>
        <StyledAlert>
          <StyledCounter variant="h4">{model.alerts_count}</StyledCounter>
        </StyledAlert>
      </StyledModelInfo>
    </StyledContainer>
  );
}
