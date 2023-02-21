import styled from 'styled-components';
import { Tooltip } from '@mui/material';
import { colors } from 'theme/colors';

const NoDataErrorToolTip = styled(Tooltip)`
  margin: 0 16px 0 auto;
`;

const NoDataErrorImg = styled.img`
  width: 24px;
`;

const NoDataErrorPopperTextBox = styled.span`
  color: ${colors.neutral.white};
`;

const NoDataErrorPopperLink = styled.a`
  text-decoration: none;
  color: ${colors.primary.violet[400]};
`;

export { NoDataErrorToolTip, NoDataErrorImg, NoDataErrorPopperTextBox, NoDataErrorPopperLink };
