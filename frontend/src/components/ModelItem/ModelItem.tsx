import { alpha, Box, Typography } from '@mui/material';
import { ModelsInfoSchema } from 'api/generated';
import { GlobalStateContext } from 'Context';
import dayjs from 'dayjs';
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StyledContainer, StyledModelInfo, StyledTypographyDate } from './ModelItem.style';

interface ModelItemProps {
  alertsCount: number;
  model: ModelsInfoSchema;
}

const severity = 'critical';

export function ModelItem({ alertsCount, model }: ModelItemProps) {
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
        <Box
          sx={{
            padding: '0 10px',
            height: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme => alpha(theme.palette.severity[severity], 0.1),
            borderRadius: '20px'
          }}
        >
          <Typography variant="h4" sx={{ color: theme => theme.palette.severity[severity], lineHeight: '25px' }}>
            {alertsCount}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: theme => theme.palette.severity[severity], lineHeight: '14px', letterSpacing: '0.1px' }}
          >
            {`${severity[0].toUpperCase()}${severity.slice(1)}`}
          </Typography>
        </Box>
      </StyledModelInfo>
    </StyledContainer>
  );
}
