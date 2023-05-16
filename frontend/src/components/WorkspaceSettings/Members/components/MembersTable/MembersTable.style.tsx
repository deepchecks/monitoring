import { styled } from '@mui/material';
import TableContainer from '@mui/material/TableContainer';
import IconButton from '@mui/material/IconButton';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

export const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  boxShadow: 'none',
  maxHeight: 'calc(100vh - 446px)',
  backgroundColor: theme.palette.grey[100],
  borderRadius: 0,
  marginBottom: '50px',

  '& .MuiCheckbox-root': {
    color: theme.palette.primary.main
  }
})) as typeof TableContainer;

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontWeight: 600,
    fontSize: 14,
    color: theme.palette.text.disabled,
    backgroundColor: theme.palette.grey[100],
    border: 0,
    borderRadius: 0,
    cursor: 'default'
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 16
  }
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(even)': {
    backgroundColor: theme.palette.grey[100]
  },

  '& td:first-child': {
    borderTopLeftRadius: '10px',
    borderBottomLeftRadius: '10px'
  },

  '& td:last-child': {
    borderTopRightRadius: '10px',
    borderBottomRightRadius: '10px'
  },

  '& td, th': {
    border: 0,
    padding: '9px 16px'
  },

  backgroundColor: theme.palette.common.white,
  cursor: 'pointer'
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  background: 'transparent',

  '& svg': {
    fill: theme.palette.grey[400]
  }
}));
