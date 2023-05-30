import { styled, Stack } from '@mui/material';
import TableContainer from '@mui/material/TableContainer';
import IconButton from '@mui/material/IconButton';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import { StyledButton } from 'components/lib';

export const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  boxShadow: 'none',
  backgroundColor: theme.palette.grey[100],
  borderRadius: 0,
  marginBottom: '50px',

  '& .MuiCheckbox-root': {
    color: theme.palette.primary.main
  }
})) as typeof TableContainer;

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 500,

  [`&.${tableCellClasses.head}`]: {
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

export const StyledTableCellBold = styled(StyledTableCell)({
  fontWeight: 600
});

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(even)': {
    backgroundColor: theme.palette.grey[100]
  },

  '& td:first-of-type': {
    borderTopLeftRadius: '10px',
    borderBottomLeftRadius: '10px'
  },

  '& td:last-of-type': {
    borderTopRightRadius: '10px',
    borderBottomRightRadius: '10px'
  },

  '& td, th': {
    border: 0,
    padding: '9px 16px'
  },

  backgroundColor: theme.palette.common.white
}));

export const StyledIconButton = styled(IconButton)(({ theme }) => ({
  background: 'transparent',

  '& svg': {
    fill: theme.palette.grey[400]
  }
}));

export const StyledDialogListContainer = styled(Stack)({
  height: '460px',
  overflow: 'auto'
});

export const StyledTableCellButton = styled(StyledButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 600,
  padding: 0,

  '&:hover': {
    opacity: 0.5
  }
}));
