import React, { useState, useRef, RefObject } from 'react';

import { TableChart, Delete } from '@mui/icons-material';
import { Stack, Typography, Tooltip } from '@mui/material';

import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { ConnectedModelSchema } from 'api/generated';

import { ModalItemViewDetails } from './components/ModalItemViewDetails';
import { ModelInfoBadge } from './components/ModelInfoBadge';
import { FooterItem } from './components/FooterItem';

import {
  StyledModelInfoItemContainer,
  StyledModelInfoItemHeader,
  StyledModelInfoItemName,
  StyledHoverButtonContainer,
  StyledDeleteModelButton,
  StyledDeleteModelButtonText,
  StyledModelInfoItemFooter,
  StyledModelInfoBadgesContainer
} from './ModelInfoItem.style';

dayjs.extend(localizedFormat);

interface ModelInfoItemProps {
  model: ConnectedModelSchema;
  onDelete: () => void;
}

const MAX_MODEL_NAME_WIDTH = 275;

const isEllipsisActiveCheck = (e: RefObject<HTMLElement>) => e.current && e.current.offsetWidth >= MAX_MODEL_NAME_WIDTH;

export const ModelInfoItem = ({ model, onDelete }: ModelInfoItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [open, setOpen] = useState(false);

  const {
    name,
    latest_update,
    n_of_pending_rows,
    n_of_alerts,
    n_of_updating_versions,
    sample_count,
    label_count,
    label_ratio
  } = model;

  const modelNameRef = useRef<HTMLElement>(null);
  const isEllipsisActive = !isEllipsisActiveCheck(modelNameRef);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <StyledModelInfoItemContainer onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <StyledModelInfoItemHeader direction="row">
        <Stack flexGrow={1}>
          <Tooltip
            disableFocusListener={isEllipsisActive}
            disableHoverListener={isEllipsisActive}
            disableTouchListener={isEllipsisActive}
            title={name}
            placement="top"
          >
            <StyledModelInfoItemName maxWidth={MAX_MODEL_NAME_WIDTH}>
              <span ref={modelNameRef}>{name}</span>
            </StyledModelInfoItemName>
          </Tooltip>
          <Typography>Last update: {latest_update ? dayjs(latest_update).format('L') : '-'}</Typography>
        </Stack>
      </StyledModelInfoItemHeader>
      <StyledModelInfoBadgesContainer isHovered={isHovered}>
        <ModelInfoBadge value={n_of_alerts} title="Critical Alerts" />
        <ModelInfoBadge value={n_of_updating_versions} title="Versions Updating" />
        <ModelInfoBadge value={n_of_pending_rows} title="Pending Rows" />
      </StyledModelInfoBadgesContainer>
      <StyledModelInfoItemFooter>
        <FooterItem value={sample_count} title="samples" />
        <FooterItem value={label_count} title="labels" />
        <FooterItem value={+((1 - label_ratio) * 100).toFixed(2)} title="missing labels %" />
      </StyledModelInfoItemFooter>
      {isHovered && (
        <>
          <StyledHoverButtonContainer>
            <StyledDeleteModelButton onClick={handleOpen}>
              <Stack sx={{ alignItems: 'center' }}>
                <TableChart color="primary" fontSize="large" sx={{ marginBottom: '6px' }} />
                <StyledDeleteModelButtonText>View Details</StyledDeleteModelButtonText>
              </Stack>
            </StyledDeleteModelButton>
            <StyledDeleteModelButton sx={{ marginLeft: '30px' }} onClick={onDelete}>
              <Stack>
                <Delete color="primary" fontSize="large" />
                <StyledDeleteModelButtonText marginTop="6px">Delete</StyledDeleteModelButtonText>
              </Stack>
            </StyledDeleteModelButton>
          </StyledHoverButtonContainer>
        </>
      )}
      <ModalItemViewDetails open={open} onClose={handleClose} model={model} />
    </StyledModelInfoItemContainer>
  );
};
