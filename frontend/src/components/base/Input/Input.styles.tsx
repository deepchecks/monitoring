import styled from 'styled-components';
import { Input } from '@mui/material';
import { theme } from 'theme';

const StyledTextInput = styled(Input)`
  font-size: 1rem;
  width: 100%;
  border-radius: 10px;
  border: 1px solid ${theme.palette.grey[200]};
  gap: 12px;
  padding: 8px 12px;
`;

export { StyledTextInput };
