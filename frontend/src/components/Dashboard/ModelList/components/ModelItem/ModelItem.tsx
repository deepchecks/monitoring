import React, { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { Box } from '@mui/material';

import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { ModelManagmentSchema, ConnectedModelSchema } from 'api/generated';

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

import { handleSetParams } from 'helpers/utils/getParams';

import { constants } from '../../../dashboard.constants';

dayjs.extend(localizedFormat);

interface ModelItemProps {
  activeModel: boolean;
  model: ModelManagmentSchema;
  connectedModelsMap: Record<string, ConnectedModelSchema>;
  onModelClick: (model: ModelManagmentSchema) => void;
}

const { lastDataUpdate } = constants.modelList.modelItem;

export function ModelItem({ activeModel, onModelClick, model, connectedModelsMap }: ModelItemProps) {
  const navigate = useNavigate();

  const { id, name, latest_time, alerts_count, max_severity, has_data } = model;

  const pendingRows = connectedModelsMap[id]?.n_of_pending_rows;

  const handleAlertClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    navigate({ pathname: '/alerts', search: handleSetParams('modelId', id, false) });
  };

  useEffect(() => {
    activeModel && onModelClick(model);
  }, [activeModel]);

  return (
    <StyledContainer active={activeModel} onClick={() => onModelClick(model)} autoFocus={activeModel}>
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
          <StyledAlertsCount variant="h4">{alerts_count}</StyledAlertsCount>
        </StyledAlertBadge>
      </StyledModelInfo>
    </StyledContainer>
  );
}
