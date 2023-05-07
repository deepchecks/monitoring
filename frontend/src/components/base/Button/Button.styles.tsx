import styled from 'styled-components';
import { Button } from '@mui/material';
import { theme } from 'components/lib/theme';

interface ButtonProps {
  fontSize?: string;
  margin?: string;
}

const WhiteGrayButton = styled(Button)<ButtonProps>`
  && {
    background: ${theme.palette.grey[300]};
    color: ${theme.palette.grey[300]};
    margin: ${p => p.margin};
    font-size: ${p => p.fontSize};
    border: none;
    box-shadow: none;
    justify-content: center;

    :hover {
      background: ${theme.palette.grey[300]};
      color: ${theme.palette.grey[300]};
      box-shadow: none;
    }
  }
`;

export { WhiteGrayButton };
