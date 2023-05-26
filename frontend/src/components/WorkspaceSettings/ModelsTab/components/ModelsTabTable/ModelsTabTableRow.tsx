import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import { TableRowProps } from '@mui/material';

import { StyledButton } from 'components/lib';

import { StyledTableRow, StyledTableCell, StyledTableCellBold } from '../../../WorkspaceSettings.styles';

import { constants } from '../../modelsTab.constants';

interface ModelsTabTableRowProps extends TableRowProps {
  model: ModelManagmentSchema;
  editMembers: (model: ModelManagmentSchema) => void;
}

export const ModelsTabTableRow = ({ model, editMembers, ...otherProps }: ModelsTabTableRowProps) => {
  const { id, name, members } = model;

  return (
    <StyledTableRow key={id} sx={{ height: 60 }} {...otherProps}>
      <StyledTableCellBold scope="row">{name || 'n/a'}</StyledTableCellBold>
      <StyledTableCell>{`${members.length} member${members.length === 1 ? '' : 's'}`}</StyledTableCell>
      <StyledTableCell align="right">
        <StyledButton
          label={constants.editMembers}
          variant="text"
          onClick={() => editMembers(model)}
          sx={theme => ({ color: theme.palette.primary.main, fontWeight: 600 })}
        />
      </StyledTableCell>
    </StyledTableRow>
  );
};
