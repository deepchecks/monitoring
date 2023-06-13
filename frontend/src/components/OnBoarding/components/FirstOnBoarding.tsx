import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import OnBoarding from '../OnBoarding';

import { getOnboardingStateApiV1OnboardingGet } from 'api/generated';

import { StyledContainer, StyledImage, StyledText } from 'components/lib';

import { FirstOnBoardingOutlinedBox, FirstOnBoardingSelectContainer, FirstOnBoardingTitle } from '../OnBoarding.styles';

import demoDataImg from '../../../assets/onBoarding/demo.svg';
import userDataImg from '../../../assets/onBoarding/user.svg';

import { constants } from '../onBoarding.constants';

const FirstOnBoarding = () => {
  const [dataType, setDataType] = useState<'demo' | 'user'>();
  const [initialStep, setInitialStep] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const handleConditionalOnboarding = async () => {
      const res = await getOnboardingStateApiV1OnboardingGet();
      setInitialStep(res?.step);

      if (res.step === 4) {
        navigate('/');
      }
    };

    handleConditionalOnboarding();
  }, []);

  return (
    <StyledContainer type="bg" width="100%" minHeight="100vh" height="100%">
      <StyledContainer maxWidth={dataType ? 1100 : 770} margin="16px auto">
        <FirstOnBoardingSelectContainer>
          <FirstOnBoardingTitle>{constants.first.title}</FirstOnBoardingTitle>
        </FirstOnBoardingSelectContainer>
        {dataType ? (
          <OnBoarding dataType={dataType} initialStep={initialStep} />
        ) : (
          <>
            <StyledText text={constants.first.description} type="h2" color="gray" fontSize="18px" />
            <StyledText text={constants.first.chooseText} margin="50px 0 12px" type="h3" fontSize="18px" />
            <StyledContainer display="flex" flexDirection="row" gap="24px" padding={0}>
              <FirstOnBoardingOutlinedBox onClick={() => setDataType('user')}>
                <StyledImage src={userDataImg} />
              </FirstOnBoardingOutlinedBox>
              <FirstOnBoardingOutlinedBox onClick={() => setDataType('demo')}>
                <StyledImage src={demoDataImg} />
              </FirstOnBoardingOutlinedBox>
            </StyledContainer>
          </>
        )}
      </StyledContainer>
    </StyledContainer>
  );
};

export default FirstOnBoarding;
