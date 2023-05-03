import React, { useState } from 'react';

import OnBoarding from '../OnBoarding';

import { StyledContainer, StyledImage, StyledText } from 'components/lib';
import { FirstOnBoardingBoxLabel, FirstOnBoardingTitle } from '../OnBoarding.styles';

import demoDataImg from '../../../assets/onBoarding/demo.svg';
import userDataImg from '../../../assets/onBoarding/user.svg';

import { constants } from '../onBoarding.constants';

const FirstOnBoarding = () => {
  const [dataType, setDataType] = useState<'demo' | 'user'>();

  return (
    <StyledContainer maxWidth={770} margin="24px auto">
      <FirstOnBoardingTitle>{constants.first.title}</FirstOnBoardingTitle>
      {dataType ? (
        <OnBoarding />
      ) : (
        <>
          <StyledText text={constants.first.description} type="bodyBold" />
          <StyledText text={constants.first.chooseText} type="bodyNormal" margin="50px 0 4px" />
          <StyledContainer display="flex" flexDirection="row" padding={0}>
            <StyledContainer border="2px solid #7964FF" onClick={() => setDataType('user')}>
              <StyledImage src={userDataImg} padding="12px" />
              <FirstOnBoardingBoxLabel>{constants.first.userDataBtnLabel}</FirstOnBoardingBoxLabel>
            </StyledContainer>
            <StyledContainer border="2px solid #7964FF" onClick={() => setDataType('demo')}>
              <StyledImage src={demoDataImg} />
              <FirstOnBoardingBoxLabel>{constants.first.demoDataBtnLabel}</FirstOnBoardingBoxLabel>
            </StyledContainer>
          </StyledContainer>
        </>
      )}
    </StyledContainer>
  );
};

export default FirstOnBoarding;
