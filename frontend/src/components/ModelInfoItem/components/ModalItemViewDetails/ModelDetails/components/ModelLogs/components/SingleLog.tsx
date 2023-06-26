import React from 'react';

import dayjs from 'dayjs';

import { IngestionErrorSchema } from 'api/generated';

import { StyledToolTip } from 'components/lib';
import { StyledCellText, StyledTableCell, StyledTableRow } from '../../../ModelDetails.style';
import { theme } from 'components/lib/theme';

interface SingleErrorProps {
  log: IngestionErrorSchema;
}

export const SingleLog = ({ log }: SingleErrorProps) => (
  <StyledTableRow>
    <StyledTableCell width="20%">
      <StyledCellText weight={600} color={theme.palette.primary.main}>
        {log.model_version_id}
      </StyledCellText>
    </StyledTableCell>
    <StyledTableCell width="20%">
      <StyledCellText>{log.created_at ? `${dayjs(log.created_at).format('L LT')}` : '- '}</StyledCellText>
    </StyledTableCell>
    <StyledTableCell width="20%">
      <StyledCellText width="265px" noWrap={true}>
        {log.error}
      </StyledCellText>
    </StyledTableCell>
    <StyledTableCell width="20%">
      <StyledCellText>{log.sample_id}</StyledCellText>
    </StyledTableCell>
    <StyledTableCell width="20%">
      <StyledToolTip text={`${log.sample}`}>
        <StyledCellText width="325px" noWrap={true}>
          {log.sample}
        </StyledCellText>
      </StyledToolTip>
    </StyledTableCell>
  </StyledTableRow>
);
