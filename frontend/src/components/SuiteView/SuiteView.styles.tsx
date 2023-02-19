import styled from 'styled-components';
import { LinearProgress } from '@mui/material';

const SuiteViewPageContainer = styled.div`
  width: 100%;
  align-items: center;
`;

const SuiteViewPageIFrame = styled.iframe`
  width: 100%;
  height: calc(100vh - 180px);
  margin: 30px auto;
  border: none;
`;

const SuiteViewLoadingContainer = styled.div`
  width: 100%;
  max-width: 500px;
  text-align: center;
  margin: 20vh auto;
`;

const SuiteViewLoadingText = styled.p`
  color: gray;
`;

const SuiteViewLoadingImg = styled.img`
  width: 100%;
  max-width: 480px;
`;

const SuiteViewLoadingBar = styled(LinearProgress)`
  && {
    border-radius: 14px;
    height: 12px;
    margin: 64px 0;
  }
`;

const SuiteViewHeaderContainer = styled.div`
  width: 100%;
  text-align: left;
`;

const SuiteViewHeaderDatesContainer = styled.span`
  margin-left: auto;
  display: flex;
  align-items: center;
`;

const SuiteViewHeaderDatesText = styled.p`
  margin: 0 0 0 auto;
  font-weight: 700;
  font-size: 20px;
`;

interface SuiteViewHeaderTextProps {
  bold?: boolean;
}

const SuiteViewHeaderText = styled.p<SuiteViewHeaderTextProps>`
  margin: 0 4px;
  font-weight: ${p => p.bold && '700'};
`;

const SuiteViewHeaderInnerFlex = styled.span`
  display: flex;
  width: 100%;
  align-items: center;
`;

const SuiteViewHeaderTag = styled.span`
  margin-right: 12px;
  background: lightgray;
  border-radius: 8px;
  padding: 4px 16px;
  display: flex;
  flex-direction: row;
`;

const SuiteViewHeaderImg = styled.img`
  width: 30px;
  height 30px;
  margin-right: 12px;
`;

export {
  SuiteViewPageContainer,
  SuiteViewLoadingContainer,
  SuiteViewLoadingImg,
  SuiteViewLoadingBar,
  SuiteViewHeaderContainer,
  SuiteViewHeaderInnerFlex,
  SuiteViewHeaderTag,
  SuiteViewLoadingText,
  SuiteViewHeaderText,
  SuiteViewPageIFrame,
  SuiteViewHeaderDatesText,
  SuiteViewHeaderDatesContainer,
  SuiteViewHeaderImg
};
