import React from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { ModelManagmentSchema } from 'api/generated';

import { Box } from '@mui/material';

import { events, reportEvent } from 'helpers/mixPanel';

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
import { setParams } from 'helpers/utils/getParams';

dayjs.extend(localizedFormat);

interface ModelItemProps {
  activeModel: boolean;
  onModelClick: (modelId: number) => void;
  onReset: (event: React.MouseEvent<HTMLDivElement>) => void;
  model: ModelManagmentSchema;
}

export function ModelItem({ activeModel, onModelClick, model }: ModelItemProps) {
  const navigate = useNavigate();

  const handleAlertClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    navigate({ pathname: '/alerts', search: setParams('modelId', model.id, false)});
  };

  const handleModelClick = () => {
    reportEvent(events.clickedModelInModelList);
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
