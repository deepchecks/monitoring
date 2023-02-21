import React from 'react';

import { constants } from 'components/SuiteView/helpers/suiteViewPage.constants';

import { SingleCheckRunOptions } from 'api/generated';

import loadingImg from '../../assets/icon/calendar.svg';

import {
  SuiteViewHeaderContainer,
  SuiteViewHeaderDatesContainer,
  SuiteViewHeaderDatesText,
  SuiteViewHeaderImg,
  SuiteViewHeaderInnerFlex,
  SuiteViewHeaderTag,
  SuiteViewHeaderText
} from './SuiteView.styles';

export interface SuiteViewHeaderProps {
  modelVersionId: number;
  runSuitePayload: SingleCheckRunOptions;
}

const SuiteViewHeader = (props: SuiteViewHeaderProps) => {
  const { modelVersionId, runSuitePayload } = props;

  return (
    <SuiteViewHeaderContainer>
      <SuiteViewHeaderInnerFlex>
        <h2>{constants.suiteViewHeaderTitle(modelVersionId)}</h2>
        <SuiteViewHeaderDatesContainer>
          <SuiteViewHeaderImg src={loadingImg} alt={constants.loadingImgAlt} />
          <SuiteViewHeaderDatesText>
            {constants.suiteViewHeaderDate(runSuitePayload.start_time, runSuitePayload.end_time)}
          </SuiteViewHeaderDatesText>
        </SuiteViewHeaderDatesContainer>
      </SuiteViewHeaderInnerFlex>
      <SuiteViewHeaderInnerFlex wrap>
        {runSuitePayload.filter?.filters.map((filter, i) => (
          <SuiteViewHeaderTag key={i}>
            <SuiteViewHeaderText bold>
              {filter.column} {filter.operator}:
            </SuiteViewHeaderText>
            <SuiteViewHeaderText>{filter.value as string}</SuiteViewHeaderText>
          </SuiteViewHeaderTag>
        ))}
      </SuiteViewHeaderInnerFlex>
    </SuiteViewHeaderContainer>
  );
};

export default SuiteViewHeader;
