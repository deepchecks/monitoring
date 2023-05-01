import React from 'react';

import loadingImg from '../../assets/icon/loading-suite.svg';

import { StyledImage, StyledText } from 'components/lib';
import { SuiteViewLoadingBar, SuiteViewLoadingContainer } from './SuiteView.styles';

import { constants } from 'components/SuiteView/helpers/suiteViewPage.constants';

const SuiteViewLoading = () => (
  <SuiteViewLoadingContainer>
    <StyledImage src={loadingImg} alt={constants.loadingImgAlt} width="400px" />
    <StyledText type="h1" text={constants.loadingHeader} margin="24px" />
    <StyledText text={constants.loadingDescription} />
    <SuiteViewLoadingBar />
  </SuiteViewLoadingContainer>
);

export default SuiteViewLoading;
