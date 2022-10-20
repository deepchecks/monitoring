import React, { useState, useRef, RefObject, useEffect } from 'react';
import dayjs from 'dayjs';

import { ModelManagmentSchema, ModelVersionManagmentSchema } from 'api/generated';

import { Stack, Typography, Tooltip } from '@mui/material';

import ModelInfoBadge from './ModelInfoBadge';
import VersionsList from './VersionsList';

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
  StyledDeleteModelButtonContainer,
  StyledDeleteModelButton,
  StyledDeleteModelButtonText
} from './ModelInfoItem.style';

import { CloseIcon, DeleteIcon } from 'assets/icon/icon';

interface ModelInfoItemProps {
  model: ModelManagmentSchema;
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

  const { name, latest_time: lastUpdate, monitors_count: monitors, alerts_count: alerts, versions } = model;

  useEffect(() => {
    const sorted = sortVersionsByEndDate(versions);
    setSortedVersions(sorted);
  }, [model]);

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
          <Typography>Last update: {lastUpdate ? dayjs.unix(lastUpdate).format('MMM. DD, YYYY') : '-'}</Typography>
        </Stack>

        <ModelInfoBadge value={monitors} title="Monitors" />
        <ModelInfoBadge value={alerts} title="Alerts" marginLeft="8px" />
      </StyledModelInfoItemHeader>
      <Stack sx={{ p: '20px' }}>
        {sortedVersions.length === 0 ? (
          <StyledNoVersionsTitle>There are no versions for this model yet</StyledNoVersionsTitle>
        ) : (
          <>
            <StyledModelInfoVersionsTitle>Versions</StyledModelInfoVersionsTitle>
            <VersionsList versions={sortedVersions.slice(0, RANGE)} />
            {sortedVersions.length > RANGE && (
              <StyledModelInfoHandleRangeButton variant="text" onClick={handleOpen}>
                See all versions (+{sortedVersions.length - RANGE})
              </StyledModelInfoHandleRangeButton>
            )}
          </>
        )}
      </Stack>

      {isHovered && (
        <StyledDeleteModelButtonContainer>
          <StyledDeleteModelButton onClick={onDelete}>
            <Stack>
              <DeleteIcon />
              <StyledDeleteModelButtonText>Delete</StyledDeleteModelButtonText>
            </Stack>
          </StyledDeleteModelButton>
        </StyledDeleteModelButtonContainer>
      )}

      <StyledModal
        open={open}
        onClose={handleClose}
        aria-labelledby="model-versions"
        aria-describedby="model-all-versions"
      >
        <StyledModalContent>
          <StyledModalTitle>
            <StyledModalTitleText>{name} Versions list</StyledModalTitleText>
            <StyledModalCloseButton onClick={handleClose}>
              <CloseIcon />
            </StyledModalCloseButton>
          </StyledModalTitle>
          <StyledModalList>
            <VersionsList versions={sortedVersions} />
          </StyledModalList>
        </StyledModalContent>
      </StyledModal>
    </StyledModelInfoItemContainer>
  );
};

export default ModelInfoItem;
