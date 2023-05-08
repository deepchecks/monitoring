import { styled } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontWeight: 600,
    color: theme.palette.text.disabled,
    backgroundColor: theme.palette.grey[100],
    border: 0
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 16
  }
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(even)': {
    backgroundColor: theme.palette.grey[100]
  },
  border: 0

  // '& th': {
  //   // borderRadius: '4px',
  //   backgroundColor: theme.palette.grey[600]
  // }
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  background: 'transparent',

  '& svg': {
    fill: theme.palette.grey[400]
  }
}));
