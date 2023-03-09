import styled from 'styled-components';
import { Button } from '@mui/material';
import { theme } from 'theme';

const SidebarInviteButton = styled(Button)`
  && {
    background: none;
    color: ${theme.palette.primary.main};
    border: 2px solid ${theme.palette.primary.main};
    border-radius: 8px;
    width: 100%;
    height: 40px;

    :hover {
      background: ${theme.palette.primary.light};
    }
  }
`;

export { SidebarInviteButton };
