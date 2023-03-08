import { styled } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontWeight: 600,
    color: theme.palette.text.disabled,
    backgroundColor: theme.palette.common.white,
    border: 0
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 16
  }
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.grey[100]
  },
  border: 0
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  background: 'transparent',

  '& svg': {
    stroke: theme.palette.text.disabled
  }
}));