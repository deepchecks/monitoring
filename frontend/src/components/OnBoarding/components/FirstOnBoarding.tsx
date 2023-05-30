import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import OnBoarding from '../OnBoarding';

import { getOnboardingStateApiV1OnboardingGet } from 'api/generated';

import { StyledContainer, StyledImage, /* StyledSelect,*/ StyledText } from 'components/lib';
import {
  FirstOnBoardingBoxLabel,
  FirstOnBoardingOutlinedBox,
  FirstOnBoardingSelectContainer,
  FirstOnBoardingTitle
} from '../OnBoarding.styles';

import demoDataImg from '../../../assets/onBoarding/demo.svg';
import userDataImg from '../../../assets/onBoarding/user.svg';

import { constants } from '../onBoarding.constants';

const FirstOnBoarding = () => {
  const [dataType, setDataType] = useState<'demo' | 'user'>();
  const [ignoreTokenGeneration, setIgnoreTokenGeneration] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const handleConditionalOnboarding = async () => {
      const res = await getOnboardingStateApiV1OnboardingGet();

      if (res?.step > 1) {
        setIgnoreTokenGeneration(true);
      } else if (res.step === 4) {
        navigate('/');
      }
    };

    handleConditionalOnboarding();
  }, []);

  return (
    <StyledContainer type="bg" width="100%" minHeight="100vh" height="100%">
      <StyledContainer maxWidth={770} margin="16px auto">
        <FirstOnBoardingSelectContainer>
          <FirstOnBoardingTitle>{constants.first.title}</FirstOnBoardingTitle>
          {/* dataType && (
          <StyledSelect
            selections={[
              { label: constants.first.userDataToggleLabel, value: 'user' },
              { label: constants.first.demoDataToggleLabel, value: 'demo' }
            ]}
            state={dataType}
            setState={setDataType}
          />
          )*/}
        </FirstOnBoardingSelectContainer>
        {dataType ? (
          <OnBoarding dataType={dataType} ignoreTokenGeneration={ignoreTokenGeneration} />
        ) : (
          <>
            <StyledText text={constants.first.description} type="bodyBold" letterSpacing="1.5px" />
            <StyledText text={constants.first.chooseText} type="bodyNormal" margin="50px 0 4px" letterSpacing="1.5px" />
            <StyledContainer display="flex" flexDirection="row" gap="24px" padding={0}>
              <FirstOnBoardingOutlinedBox
                onClick={() => setDataType('user')}
                sx={{ opacity: 0.3, cursor: 'auto', pointerEvents: 'none' }}
              >
                <StyledImage src={userDataImg} margin="-24px 0 0 -12px" />
                <FirstOnBoardingBoxLabel>{constants.first.userDataBtnLabel}</FirstOnBoardingBoxLabel>
              </FirstOnBoardingOutlinedBox>
              <FirstOnBoardingOutlinedBox onClick={() => setDataType('demo')}>
                <StyledImage src={demoDataImg} />
                <FirstOnBoardingBoxLabel>{constants.first.demoDataBtnLabel}</FirstOnBoardingBoxLabel>
              </FirstOnBoardingOutlinedBox>
            </StyledContainer>
          </>
        )}
      </StyledContainer>
    </StyledContainer>
  );
};

export default FirstOnBoarding;
