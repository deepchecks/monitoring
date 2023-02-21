import React from 'react';

import NoDataErrorPopper from './NoDataErrorPopper';

import redWarningIcon from '../../../../../../assets/icon/red-warning.svg';

import { StyledAlertBadge } from '../ModelItem.style';
import { NoDataErrorImg, NoDataErrorToolTip } from './NoDataError.styles';

import { constants } from 'components/Dashboard/dashboard.constants';

const { noDataErrorImageAlt } = constants.modelList.modelItem;

const NoDataError = ({ predictionData }: { predictionData: boolean }) => {
  if (predictionData) {
    return <></>;
  }

  return (
    <NoDataErrorToolTip onClick={e => e.stopPropagation} title={<NoDataErrorPopper />} placement="top-start" arrow>
      <StyledAlertBadge severity={'critical'} disableHover>
        <NoDataErrorImg src={redWarningIcon} alt={noDataErrorImageAlt} />
      </StyledAlertBadge>
    </NoDataErrorToolTip>
  );
};

export default NoDataError;
