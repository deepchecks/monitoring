import { alpha, Box, Typography } from '@mui/material';
import { ModelsInfoSchema } from 'api/generated';
import { GlobalStateContext } from 'Context';
import dayjs from 'dayjs';
import React, { Dispatch, SetStateAction, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StyledContainer, StyledModelInfo, StyledTypographyDate } from './ModelItem.style';

interface ModelItemProps {
  alertsCount: number;
  filterMonitors: Dispatch<SetStateAction<number | null>>;
  model: ModelsInfoSchema;
  modelsMap: Record<number, ModelsInfoSchema>;
  sortModels: (models: ModelsInfoSchema[]) => void;
}

const severity = 'critical';

export function ModelItem({ alertsCount, filterMonitors, model, modelsMap, sortModels }: ModelItemProps) {
  const navigate = useNavigate();
  const { changeAlertFilters } = useContext(GlobalStateContext);

  const linkToAlerts = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    changeAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, models: [model.id] }));
    navigate({ pathname: '/alerts' });
  };

  const handleClickModel = () => {
    const currentModels = [modelsMap[model.id]];
    Object.entries(modelsMap).forEach(([key, value]) => {
      if (key !== model.id.toString()) {
        currentModels.push(value);
      }
    });
    sortModels(currentModels);
    filterMonitors(model.id);
  };

  return (
    <StyledContainer onClick={handleClickModel}>
      <StyledModelInfo>
        <Box>
          <Typography variant="subtitle1">{model.name}</Typography>
          <StyledTypographyDate variant="body2">
            Last data update: {model.latest_time ? dayjs.unix(model.latest_time).format('MMM. DD, YYYY') : '-'}
          </StyledTypographyDate>
        </Box>
        <Box
          sx={theme => ({
            padding: '0 10px',
            height: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.severity[severity], 0.1),
            borderRadius: '20px',
            color: theme.palette.severity[severity],
            ':hover': {
              backgroundColor: theme.palette.severity[severity],
              color: theme.palette.common.white
            }
          })}
          onClick={linkToAlerts}
        >
          <Typography variant="h4" sx={{ lineHeight: '25px' }}>
            {alertsCount}
          </Typography>
          <Typography variant="caption" sx={{ lineHeight: '14px', letterSpacing: '0.1px' }}>
            {`${severity[0].toUpperCase()}${severity.slice(1)}`}
          </Typography>
        </Box>
      </StyledModelInfo>
    </StyledContainer>
  );
}
