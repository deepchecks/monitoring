import styled from 'styled-components';
import { Tooltip } from '@mui/material';
import { theme } from 'components/lib/theme';

const NoDataErrorToolTip = styled(Tooltip)`
  margin: 0 16px 0 auto;
`;

const NoDataLoaderContained = styled.div`
  width: 40px;
  height: 40px;
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

export { NoDataErrorToolTip, NoDataErrorImg, NoDataErrorPopperTextBox, NoDataErrorPopperLink, NoDataLoaderContained };
