import React from 'react';
import dayjs from 'dayjs';

import { ModelVersionManagmentSchema } from 'api/generated';

import { Stack } from '@mui/material';

import { StyledVersion } from './ModelInfoItem.style';

interface VersionsListProps {
  versions: ModelVersionManagmentSchema[];
}

const VersionsList = ({ versions }: VersionsListProps) => (
  <Stack>
    {versions.map(version => (
      <StyledVersion key={version.id}>
        {version.name} {version.end_time ? `(${dayjs(version.end_time).format('MMM. DD, YYYY')})` : ''}
      </StyledVersion>
    ))}
  </Stack>
);

export default VersionsList;
