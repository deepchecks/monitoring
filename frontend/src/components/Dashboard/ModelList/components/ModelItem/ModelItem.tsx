import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import mixpanel from 'mixpanel-browser';

import { GlobalStateContext } from 'context';
import { ModelManagmentSchema } from 'api/generated';

import { Box } from '@mui/material';

import {
  StyledContainer,
  StyledModelInfo,
  StyledDateContainer,
  StyledDateTitle,
  StyledDateValue,
  StyledAlertBadge,
  StyledModelName,
  StyledAlertsCount
} from './ModelItem.style';

dayjs.extend(localizedFormat);

interface ModelItemProps {
  activeModel: boolean;
  onModelClick: (modelId: number) => void;
  onReset: (event: React.MouseEvent<HTMLDivElement>) => void;
  model: ModelManagmentSchema;
}

export function ModelItem({ activeModel, onModelClick, model }: ModelItemProps) {
  const navigate = useNavigate();
  const { changeAlertFilters } = useContext(GlobalStateContext);

  const handleAlertClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    changeAlertFilters(prevAlertFilters => ({ ...prevAlertFilters, models: [model.id] }));
    navigate({ pathname: '/alerts' });
  };

  const handleModelClick = () => {
    mixpanel.track('Click on a model in the model list');
    onModelClick(model.id);
  };

  return (
    <StyledContainer active={activeModel} onClick={handleModelClick}>
      <StyledModelInfo>
        <Box>
          <StyledModelName>{model.name}</StyledModelName>
          <StyledDateContainer>
            <StyledDateTitle>Last data update:&nbsp;</StyledDateTitle>
            <StyledDateValue>{model.latest_time ? dayjs.unix(model.latest_time).format('L') : '-'}</StyledDateValue>
          </StyledDateContainer>
        </Box>
        <StyledAlertBadge severity={model?.max_severity} alertsCount={model.alerts_count} onClick={handleAlertClick}>
          <StyledAlertsCount>{model.alerts_count}</StyledAlertsCount>
        </StyledAlertBadge>
      </StyledModelInfo>
    </StyledContainer>
  );
}
