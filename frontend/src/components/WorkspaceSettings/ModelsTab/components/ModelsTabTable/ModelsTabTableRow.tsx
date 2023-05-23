import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import { TableRowProps } from '@mui/material';

import { StyledTableRow, StyledTableCell } from '../../../WorkspaceSettings.styles';

interface ModelsTabTableRowProps extends TableRowProps {
  model: ModelManagmentSchema;
}

export const ModelsTabTableRow = ({ model, ...otherProps }: ModelsTabTableRowProps) => {
  const { id, name } = model;

  return (
    <StyledTableRow key={id} sx={{ height: 60 }} {...otherProps}>
      <StyledTableCell scope="row">{name || 'n/a'}</StyledTableCell>
      <StyledTableCell>14 members</StyledTableCell>
      <StyledTableCell align="right">Edit members</StyledTableCell>
    </StyledTableRow>
  );
};
