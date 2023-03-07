import styled from 'styled-components';
import { Tooltip } from '@mui/material';
import { theme } from 'theme';

const NoDataErrorToolTip = styled(Tooltip)`
  margin: 0 16px 0 auto;
`;

const NoDataErrorImg = styled.img`
  width: 24px;
`;

const NoDataErrorPopperTextBox = styled.span`
  color: ${theme.palette.common.white};
`;

const NoDataErrorPopperLink = styled.a`
  text-decoration: none;
  color: ${theme.palette.primary.main};
`;

export { NoDataErrorToolTip, NoDataErrorImg, NoDataErrorPopperTextBox, NoDataErrorPopperLink };
