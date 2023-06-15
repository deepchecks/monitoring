import React from 'react';

import dayjs from 'dayjs';

import { styled, Tooltip, Typography } from '@mui/material';

import { IngestionErrorSchema } from 'api/generated';

import { StyledTableCell, StyledTableRow } from '../../../ModelDetails.style';
import { theme } from 'components/lib/theme';

interface SingleErrorProps {
  log: IngestionErrorSchema;
}

export const SingleLog = ({ log }: SingleErrorProps) => (
  <StyledTableRow>
    <StyledTableCell width="20%">
      <StyledCellText weight={600} color={theme.palette.primary.main}>
        {log.id}
      </StyledCellText>
    </StyledTableCell>
    <StyledTableCell width="20%">
      <StyledCellText>{log.created_at ? `${dayjs(log.created_at).format('L LT')}` : '- '}</StyledCellText>
    </StyledTableCell>
    <StyledTableCell width="20%">
      <Tooltip title={`${log.error}`}>
        <StyledCellText width="265px" noWrap={true}>
          {log.error}
        </StyledCellText>
      </Tooltip>
    </StyledTableCell>
    <StyledTableCell width="20%">
      <StyledCellText>{log.sample_id}</StyledCellText>
    </StyledTableCell>
    <StyledTableCell width="20%">
      <Tooltip title={`${log.sample}`}>
        <StyledCellText width="325px" noWrap={true}>
          {log.sample}
        </StyledCellText>
      </Tooltip>
    </StyledTableCell>
  </StyledTableRow>
);

const StyledCellText = styled(Typography)(
  ({ width, color, weight }: { width?: string; color?: string; weight?: number }) => ({
    fontWeight: weight ? weight : 400,
    fontSize: 'inherit',
    width: width ? width : '100%',
    color: color ? color : 'inherit'
  })
);
