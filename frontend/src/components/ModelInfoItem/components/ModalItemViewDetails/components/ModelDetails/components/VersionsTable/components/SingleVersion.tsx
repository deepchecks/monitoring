import React from 'react';
import { Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { ViewDetails } from 'assets/icon/icon';
import { ConnectedModelVersionSchema } from 'api/generated';
import { StyledButtonTableCell, StyledIconButton, StyledTableCell, StyledTableRow } from '../../../ModelDetails.style';
import { WarningLabel } from './WarningLabel';

interface SingleVersionProps {
  version: ConnectedModelVersionSchema;
  onButtonClick: (version: ConnectedModelVersionSchema) => void;
}

export const SingleVersion = ({ version, onButtonClick }: SingleVersionProps) => (
  <>
    <StyledTableRow>
      <StyledTableCell width={343}>
        <Stack spacing="12px" direction="row">
          {version.n_of_alerts > 0 && <WarningLabel numberOfAlerts={version.n_of_alerts} />}
          <Typography sx={{ fontWeight: 600 }} component="span">
            {version.name}
          </Typography>
        </Stack>
      </StyledTableCell>
      <StyledTableCell width={286}>
        {version.last_update_time ? `${dayjs(version.last_update_time).format('lll')}` : '- '}
      </StyledTableCell>
      <StyledTableCell align={'center'} width={362}>
        {version.n_of_pending_rows}
      </StyledTableCell>
      <StyledButtonTableCell align={'center'} width={145}>
        <StyledIconButton onClick={() => onButtonClick(version)}>
          <ViewDetails />
        </StyledIconButton>
      </StyledButtonTableCell>
    </StyledTableRow>
  </>
);
