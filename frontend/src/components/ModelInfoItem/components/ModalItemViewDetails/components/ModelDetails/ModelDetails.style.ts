import { IconButton, styled, TableCell, TableRow } from '@mui/material';
import { colors } from 'theme/colors';

interface StyledTableCellProps {
  width: number | string;
}

export const StyledTableRow = styled(TableRow)({
  backgroundColor: colors.neutral.grey.semiLight,
  '&:nth-of-type(even)': {
    backgroundColor: colors.neutral.white
  }
});

export const StyledTableCell = styled(TableCell)<StyledTableCellProps>(({ width }) => ({
  padding: '16px 20px',
  border: 0,
  width,
  color: colors.neutral.darkText,
  fontWeight: 600
}));

export const StyledTableHeadCell = styled(StyledTableCell)({
  fontSize: '14px',
  color: colors.neutral.lightText,
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
