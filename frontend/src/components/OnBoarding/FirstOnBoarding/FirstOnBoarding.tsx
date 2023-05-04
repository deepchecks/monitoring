import React, { useState } from 'react';

import OnBoarding from '../OnBoarding';

import { StyledContainer, StyledImage, StyledSelect, StyledText } from 'components/lib';
import { FirstOnBoardingBoxLabel, FirstOnBoardingTitle } from '../OnBoarding.styles';

import demoDataImg from '../../../assets/onBoarding/demo.svg';
import userDataImg from '../../../assets/onBoarding/user.svg';

import { constants } from '../onBoarding.constants';

const FirstOnBoarding = () => {
  const [dataType, setDataType] = useState<'demo' | 'user'>();

  return (
    <StyledContainer maxWidth={770} margin="84px auto">
      <StyledContainer display="grid" gridTemplateColumns="auto 275px" alignItems="center">
        <FirstOnBoardingTitle>{constants.first.title}</FirstOnBoardingTitle>
        {dataType && (
          <StyledSelect
            selections={[
              { label: constants.first.userDataToggleLabel, value: 'user' },
              { label: constants.first.demoDataToggleLabel, value: 'demo' }
            ]}
            state={dataType}
            setState={setDataType}
          />
        )}
      </StyledContainer>
      {dataType ? (
        <OnBoarding dataType={dataType} />
      ) : (
        <>
          <StyledText text={constants.first.description} type="bodyBold" letterSpacing="1.5px" />
          <StyledText text={constants.first.chooseText} type="bodyNormal" margin="50px 0 4px" letterSpacing="1.5px" />
          <StyledContainer display="flex" flexDirection="row" gap="24px" padding={0}>
            <StyledContainer border="2px solid #7964FF" onClick={() => setDataType('user')} borderRadius="16px">
              <StyledImage src={userDataImg} margin="-24px 0 0 -12px" />
              <FirstOnBoardingBoxLabel>{constants.first.userDataBtnLabel}</FirstOnBoardingBoxLabel>
            </StyledContainer>
            <StyledContainer border="2px solid #7964FF" onClick={() => setDataType('demo')} borderRadius="16px">
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
