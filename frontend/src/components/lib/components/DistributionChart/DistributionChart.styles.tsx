import { styled } from '@mui/material';
import { Text } from '../Text/Text';

export const StyledTitleText = styled(Text)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  height: '20px',
  color: theme.palette.grey[600]
}));
