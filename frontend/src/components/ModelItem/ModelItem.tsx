import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import mixpanel from 'mixpanel-browser';

import { GlobalStateContext } from 'Context';
import { ModelsInfoSchema } from 'api/generated';

import { alpha, Box, Typography } from '@mui/material';

import { StyledContainer, StyledModelInfo, StyledTypographyDate } from './ModelItem.style';

interface ModelItemProps {
  activeModel: boolean;
  alertsCount: number;
  onModelClick: (modelId: number) => void;
  onReset: (event: React.MouseEvent<HTMLDivElement>) => void;
  model: ModelsInfoSchema;
}

const severity = 'critical';

export function ModelItem({ activeModel, alertsCount, onModelClick, onReset, model }: ModelItemProps) {
  const navigate = useNavigate();
  const { changeAlertFilters } = useContext(GlobalStateContext);

  const linkToAlerts = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    changeAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, models: [model.id] }));
    navigate({ pathname: '/alerts' });
  };

  const handleClickModel = () => {
    mixpanel.track('Click on a model in the model list');

    onModelClick(model.id)
  };
  
  return (
    <StyledContainer active={activeModel} onClick={handleClickModel}>
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
      {activeModel && (
        <Box
          onClick={onReset}
          sx={{
            position: 'absolute',
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: 'white',
            top: '50%',
            right: '8px',
            transform: 'translateY(-50%)',
            '::before, ::after': {
              content: "''",
              position: 'absolute',
              display: 'block',
              height: 10,
              width: 2,
              background: '#000',
              left: '50%',
              top: '50%'
            },
            ':before': {
              transform: 'translate(-50%, -50%) rotate(45deg)'
            },
            ':after': {
              transform: 'translate(-50%, -50%) rotate(-45deg)'
            }
          }}
        />
      )}
    </StyledContainer>
  );
}
