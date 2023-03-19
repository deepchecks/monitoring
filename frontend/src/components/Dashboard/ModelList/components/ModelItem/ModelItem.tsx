import React from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { ModelManagmentSchema, ConnectedModelSchema } from 'api/generated';

import { Box } from '@mui/material';

import NoDataError from './NoDataError/NoDataError';

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

import { events, reportEvent } from 'helpers/services/mixPanel';
import { setParams } from 'helpers/utils/getParams';
import { constants } from '../../../dashboard.constants';

dayjs.extend(localizedFormat);

interface ModelItemProps {
  activeModel: boolean;
  onModelClick: (model: ModelManagmentSchema) => void;
  model: ModelManagmentSchema;
  connectedModelsMap: Record<string, ConnectedModelSchema>;
}

const { lastDataUpdate } = constants.modelList.modelItem;

export function ModelItem({ activeModel, onModelClick, model, connectedModelsMap }: ModelItemProps) {
  const navigate = useNavigate();

  const { id, name, latest_time, alerts_count, max_severity, has_data } = model;
  const { n_of_pending_rows: pendingRows } = connectedModelsMap[id];

  const handleAlertClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    navigate({ pathname: '/alerts', search: setParams('modelId', id, false) });
  };

  const handleModelClick = () => {
    reportEvent(events.dashboardPage.clickedModelInModelList);
    onModelClick(model);
  };

  return (
    <StyledContainer active={activeModel} onClick={handleModelClick} autoFocus={activeModel}>
      <StyledModelInfo>
        <Box>
          <StyledModelName>{name}</StyledModelName>
          <StyledDateContainer>
            <StyledDateTitle>{lastDataUpdate}&nbsp;</StyledDateTitle>
            <StyledDateValue>{latest_time ? dayjs.unix(latest_time).format('L') : '-'}</StyledDateValue>
          </StyledDateContainer>
        </Box>
        {!has_data && <NoDataError pendingRows={pendingRows} />}
        <StyledAlertBadge severity={max_severity} alertsCount={alerts_count} onClick={handleAlertClick}>
          <StyledAlertsCount>{alerts_count}</StyledAlertsCount>
        </StyledAlertBadge>
      </StyledModelInfo>
    </StyledContainer>
  );
}
