import React, { useState, useRef, RefObject, useEffect } from 'react';
import dayjs from 'dayjs';

import { ConnectedModelSchema, ModelVersionManagmentSchema } from 'api/generated';

import { Stack, Typography, Tooltip } from '@mui/material';

import ModelInfoBadge from './ModelInfoBadge';

import {
  StyledModelInfoItemContainer,
  StyledModelInfoItemHeader,
  StyledModelInfoItemName,
  StyledModelInfoVersionsTitle,
  StyledNoVersionsTitle,
  StyledModelInfoHandleRangeButton,
  StyledModal,
  StyledModalContent,
  StyledModalTitle,
  StyledModalTitleText,
  StyledModalList,
  StyledModalCloseButton,
  StyledHoverButtonContainer,
  StyledDeleteModelButton,
  StyledDeleteModelButtonText
} from './ModelInfoItem.style';

import { CloseIcon, DeleteIcon, ViewDetails } from 'assets/icon/icon';
import ModelDetails from './ModelDetails';

interface ModelInfoItemProps {
  model: ConnectedModelSchema;
  onDelete: () => Promise<void>;
}

const MAX_MODEL_NAME_WIDTH = 275;
const RANGE = 3;

const isEllipsisActiveCheck = (e: RefObject<HTMLElement>) => e.current && e.current.offsetWidth >= MAX_MODEL_NAME_WIDTH;

const sortVersionsByEndDate = (versions: ModelVersionManagmentSchema[]) =>
  versions.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

const ModelInfoItem = ({ model, onDelete }: ModelInfoItemProps) => {
  const [sortedVersions, setSortedVersions] = useState<ModelVersionManagmentSchema[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [open, setOpen] = useState(false);

  const { name, latest_update: lastUpdate, n_of_pending_rows: nPendingRows, n_of_alerts: nAlerts, n_of_updating_versions: nVersions } = model;


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
          <Typography>Last update: {lastUpdate ? dayjs(lastUpdate).format('MMM. DD, YYYY') : '-'}</Typography>
        </Stack>

      </StyledModelInfoItemHeader>
      <Stack sx={{ p: '20px' , display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}} style={isHovered ? {filter:'blur(5px)'} : {}}>
        <ModelInfoBadge value={nAlerts} title="Critical" margin='0px 8px'/>
        <ModelInfoBadge value={nVersions} title="Versions Updating"  margin='0px 8px'/>
        <ModelInfoBadge value={nPendingRows} title="Pending Rows"  margin='0px 8px'/>
      </Stack>
      

      {isHovered && (
        <>
          <StyledHoverButtonContainer left='130px' bottom='50px'>
            <StyledDeleteModelButton onClick={handleOpen}>
              <Stack sx={{alignItems: 'center'}}>
                <ViewDetails />
                <StyledDeleteModelButtonText>View Details</StyledDeleteModelButtonText>
              </Stack>
            </StyledDeleteModelButton>
          </StyledHoverButtonContainer>
          <StyledHoverButtonContainer right='150px' bottom='50px'>
            <StyledDeleteModelButton onClick={onDelete}>
              <Stack>
                <DeleteIcon />
                <StyledDeleteModelButtonText marginTop='6px'>Delete</StyledDeleteModelButtonText>
              </Stack>
            </StyledDeleteModelButton>
          </StyledHoverButtonContainer>
        </>
      )}

      <StyledModal
        open={open}
        onClose={handleClose}
        aria-labelledby="model-versions"
        aria-describedby="model-all-versions"
      >
        <StyledModalContent>
          <StyledModalTitle>
            <StyledModalTitleText>{name} Details</StyledModalTitleText>
            <StyledModalCloseButton onClick={handleClose}>
              <CloseIcon />
            </StyledModalCloseButton>
          </StyledModalTitle>
          <StyledModalList>
            <ModelDetails model={model} />
          </StyledModalList>
        </StyledModalContent>
      </StyledModal>
    </StyledModelInfoItemContainer>
  );
};

export default ModelInfoItem;
