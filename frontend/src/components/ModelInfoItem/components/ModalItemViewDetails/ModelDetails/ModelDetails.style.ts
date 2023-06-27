import { SearchOutlined } from '@mui/icons-material';
import { IconButton, styled, TableCell, TableRow, Box, Typography } from '@mui/material';

import { StyledContainer } from 'components/lib';

interface StyledTableCellProps {
  width: number | string;
}

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey.light,
  '&:nth-of-type(even)': {
    backgroundColor: theme.palette.common.white
  }
}));

export const StyledTableCell = styled(TableCell)<StyledTableCellProps>(({ width, theme }) => ({
  padding: '16px 20px',
  border: 0,
  width,
  color: theme.palette.text.primary,
  fontWeight: 600
}));

export const StyledTableHeadCell = styled(StyledTableCell)(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.disabled,
  fontWeight: 600
}));

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

export const StyledDivider = styled(Box)(({ theme }) => ({
  width: '1.5px',
  height: '36px',
  margin: '0 12px',
  background: theme.palette.grey[400]
}));

export const StyledLogsFiltersContainer = styled(StyledContainer)({
  flexDirection: 'row',
  alignItems: 'center',
  margin: '16px 0 0'
});

export const StyledCellText = styled(Typography)(
  ({ width, color, weight }: { width?: string; color?: string; weight?: number }) => ({
    fontWeight: weight ? weight : 400,
    fontSize: 'inherit',
    width: width ? width : '100%',
    color: color ? color : 'inherit'
  })
);

export const StyledSearchBtn = styled(SearchOutlined)(({ theme }) => ({
  cursor: 'pointer',
  border: `1px solid ${theme.palette.grey[300]}`,
  outline: `1px solid ${theme.palette.common.white}`,
  borderRadius: '4px 0 0 4px',
  color: theme.palette.grey[400],
  padding: '4px',
  fontSize: '36px',
  transition: '0.5s',
  marginRight: '-8px',

  ':hover': {
    outline: `1px solid ${theme.palette.primary.main}`,
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main
  }
}));
