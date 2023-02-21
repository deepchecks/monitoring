import React from 'react';

import { constants } from 'components/Dashboard/dashboard.constants';
import { NoDataErrorPopperLink, NoDataErrorPopperTextBox } from './NoDataError.styles';

const { popperText, popperLink, popperLinkText } = constants.modelList.modelItem.noDataErrorToolTipText;

const NoDataErrorPopper = () => (
  <NoDataErrorPopperTextBox>
    {popperText}
    <NoDataErrorPopperLink href={popperLink} target="_blank">
      {popperLinkText}
    </NoDataErrorPopperLink>
  </NoDataErrorPopperTextBox>
);

export default NoDataErrorPopper;
