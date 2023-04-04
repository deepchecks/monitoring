import React from 'react';

import loadingImg from '../../assets/icon/loading-suite.svg';

import { constants } from 'components/SuiteView/helpers/suiteViewPage.constants';

import {
  SuiteViewLoadingBar,
  SuiteViewLoadingContainer,
  SuiteViewLoadingImg,
  SuiteViewLoadingText
} from './SuiteView.styles';

const SuiteViewLoading = () => (
  <SuiteViewLoadingContainer>
    <SuiteViewLoadingImg src={loadingImg} alt={constants.loadingImgAlt} />
    <h1>{constants.loadingHeader}</h1>
    <SuiteViewLoadingText>{constants.loadingDescription}</SuiteViewLoadingText>
    <SuiteViewLoadingBar />
  </SuiteViewLoadingContainer>
);

export default SuiteViewLoading;
