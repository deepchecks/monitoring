import React, { useState, useRef, RefObject } from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { ConnectedModelSchema } from 'api/generated';

import { Stack, Typography, Tooltip } from '@mui/material';

import ModelInfoBadge from './ModelInfoBadge';

import {
  StyledModelInfoItemContainer,
  StyledModelInfoItemHeader,
  StyledModelInfoItemName,
  StyledHoverButtonContainer,
  StyledDeleteModelButton,
  StyledDeleteModelButtonText
} from './ModelInfoItem.style';
import { DeleteIcon, ViewDetails } from 'assets/icon/icon';
import { ModalItemViewDetails } from './components/ModalItemViewDetails';

dayjs.extend(localizedFormat);

interface ModelInfoItemProps {
  model: ConnectedModelSchema;
  onDelete: () => Promise<void>;
}

const MAX_MODEL_NAME_WIDTH = 275;

const isEllipsisActiveCheck = (e: RefObject<HTMLElement>) => e.current && e.current.offsetWidth >= MAX_MODEL_NAME_WIDTH;

const ModelInfoItem = ({ model, onDelete }: ModelInfoItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [open, setOpen] = useState(false);

  const {
    name,
    latest_update: lastUpdate,
    n_of_pending_rows: nPendingRows,
    n_of_alerts: nAlerts,
    n_of_updating_versions: nVersions
  } = model;

  const modelNameRef = useRef<HTMLElement>(null);
  const isEllipsisActive = !isEllipsisActiveCheck(modelNameRef);

  const handleOpen = () => setOpen(true);

  const handleClose = () => setOpen(false);

  return (
    <StyledModelInfoItemContainer onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <StyledModelInfoItemHeader direction="row">
        <Stack
          sx={{
            flexGrow: 1
          }}
        >
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
          <Typography>Last update: {lastUpdate ? dayjs(lastUpdate).format('L') : '-'}</Typography>
        </Stack>
      </StyledModelInfoItemHeader>
      <Stack
        sx={{ p: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
        style={isHovered ? { filter: 'blur(5px)' } : {}}
      >
        <ModelInfoBadge value={nAlerts} title="Critical Alerts" margin="0px 8px" />
        <ModelInfoBadge value={nVersions} title="Versions Updating" margin="0px 8px" />
        <ModelInfoBadge value={nPendingRows} title="Pending Rows" margin="0px 8px" />
      </Stack>

      {isHovered && (
        <>
          <StyledHoverButtonContainer left="calc(50% - 77px)" bottom="30px">
            <StyledDeleteModelButton onClick={handleOpen}>
              <Stack sx={{ alignItems: 'center' }}>
                <ViewDetails />
                <StyledDeleteModelButtonText>View Details</StyledDeleteModelButtonText>
              </Stack>
            </StyledDeleteModelButton>
            <StyledDeleteModelButton sx={{ marginLeft: '30px', paddingTop: '7px' }} onClick={onDelete}>
              <Stack>
                <DeleteIcon />
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

export default ModelInfoItem;
