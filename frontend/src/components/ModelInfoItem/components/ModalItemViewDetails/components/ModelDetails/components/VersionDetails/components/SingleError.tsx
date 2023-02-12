import React from 'react';
import { IngestionErrorSchema } from 'api/generated';
import { styled, Tooltip, Typography } from '@mui/material';
import { StyledTableCell, StyledTableRow } from '../../../ModelDetails.style';
import dayjs from 'dayjs';
import { colors } from 'theme/colors';

interface SingleErrorProps {
  error: IngestionErrorSchema;
}

export const SingleError = ({ error }: SingleErrorProps) => (
  <StyledTableRow>
    <StyledTableCell width="12%">
      <StyledCellText weight={600} color={colors.semantic.red}>
        {error.sample_id}
      </StyledCellText>
    </StyledTableCell>
    <StyledTableCell width="35%">
      <Tooltip title={`${error.sample}`}>
        <StyledCellText width="325px" noWrap={true}>
          {error.sample}
        </StyledCellText>
      </Tooltip>
    </StyledTableCell>
    <StyledTableCell width="30%">
      <Tooltip title={`${error.error}`}>
        <StyledCellText width="265px" noWrap={true}>
          {error.error}
        </StyledCellText>
      </Tooltip>
    </StyledTableCell>
    <StyledTableCell width="23%">
      <StyledCellText>{error.created_at ? `${dayjs(error.created_at).format('L LT')}` : '- '}</StyledCellText>
    </StyledTableCell>
  </StyledTableRow>
);

interface StyledCellTextProps {
  width?: string;
  color?: string;
  weight?: number;
}

const StyledCellText = styled(Typography)<StyledCellTextProps>(({ width, color, weight }) => ({
  fontWeight: weight ? weight : 400,
  fontSize: 'inherit',
  width: width ? width : '100%',
  color: color ? color : 'inherit'
}));
