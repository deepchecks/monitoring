import styled from 'styled-components';
import { Button } from '@mui/material';
import { colors } from 'theme/colors';

interface ButtonProps {
  fontSize?: string;
  margin?: string;
}

const WhiteGrayButton = styled(Button)<ButtonProps>`
  && {
    background: ${colors.neutral.white};
    color: ${colors.neutral.grey[300]};
    margin: ${p => p.margin};
    font-size: ${p => p.fontSize};
    border: none;
    box-shadow: none;
    justify-content: center;

    :hover {
      background: ${colors.neutral.white};
      color: ${colors.neutral.grey[300]};
      box-shadow: none;
    }
  }
`;

export { WhiteGrayButton };
