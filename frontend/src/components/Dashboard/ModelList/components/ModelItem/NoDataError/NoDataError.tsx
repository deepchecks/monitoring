import React from 'react';

import NoDataErrorPopper from './NoDataErrorPopper';

import redWarningIcon from 'assets/icon/red-warning.svg';

import { StyledAlertBadge } from '../ModelItem.style';
import { NoDataErrorImg, NoDataErrorToolTip, NoDataLoaderContained } from './NoDataError.styles';

import { constants } from 'components/Dashboard/dashboard.constants';
import { Loader } from 'components/base/Loader/Loader';

const { noDataErrorImageAlt, noDataDataUpdate } = constants.modelList.modelItem;

interface NoDataErrorProps {
  pendingRows: number;
}

const NoDataError = ({ pendingRows }: NoDataErrorProps) => {
  const isPending = pendingRows > 0;
  const tooltipTitle = isPending ? noDataDataUpdate : <NoDataErrorPopper />;
  const tooltipPlacement = isPending ? 'top' : 'top-start';

  return (
    <NoDataErrorToolTip onClick={e => e.stopPropagation} title={tooltipTitle} placement={tooltipPlacement} arrow>
      {isPending ? (
        <NoDataLoaderContained>
          <Loader />
        </NoDataLoaderContained>
      ) : (
        <StyledAlertBadge severity="critical" disableHover>
          <NoDataErrorImg src={redWarningIcon} alt={noDataErrorImageAlt} />
        </StyledAlertBadge>
      )}
    </NoDataErrorToolTip>
  );
};

export default NoDataError;
