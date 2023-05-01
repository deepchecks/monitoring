import { IconButton, styled, TableCell, TableRow } from '@mui/material';

import { theme } from 'components/lib/theme';

interface StyledTableCellProps {
  width: number | string;
}

export const StyledTableRow = styled(TableRow)({
  backgroundColor: theme.palette.grey.light,
  '&:nth-of-type(even)': {
    backgroundColor: theme.palette.common.white
  }
});

export const StyledTableCell = styled(TableCell)<StyledTableCellProps>(({ width }) => ({
  padding: '16px 20px',
  border: 0,
  width,
  color: theme.palette.text.primary,
  fontWeight: 600
}));

export const StyledTableHeadCell = styled(StyledTableCell)({
  fontSize: '14px',
  color: theme.palette.text.disabled,
  fontWeight: 600
});

export const StyledVersionsTableHeadCell = styled(StyledTableHeadCell)({
  paddingTop: '32px'
});

export const StyledButtonTableCell = styled(StyledTableCell)({
  padding: '2px 20px'
});

export const StyledIconButton = styled(IconButton)({
  padding: 0,
  width: '48px',
  height: '48px',
  background: 'transparent'
});
