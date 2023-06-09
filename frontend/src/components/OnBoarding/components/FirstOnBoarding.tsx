import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import OnBoarding from '../OnBoarding';

import { getOnboardingStateApiV1OnboardingGet } from 'api/generated';

import { StyledContainer, StyledImage, StyledSelect, StyledText } from 'components/lib';
import { isLargeDesktop } from 'components/lib/theme/typography';
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
  const [initialStep, setInitialStep] = useState(1);

  const navigate = useNavigate();

  const font = isLargeDesktop ? { size: 20, lineHeight: '22px' } : { size: 16, lineHeight: '18px' };

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
          {dataType && (
            <StyledSelect
              selections={[
                { label: constants.first.userDataToggleLabel, value: 'user' },
                { label: constants.first.demoDataToggleLabel, value: 'demo' }
              ]}
              state={dataType}
              setState={setDataType}
              margin="0 0 0 36px"
              rounded
            />
          )}
        </FirstOnBoardingSelectContainer>
        {dataType ? (
          <OnBoarding dataType={dataType} initialStep={initialStep} />
        ) : (
          <>
            <StyledText
              text={constants.first.description}
              type="bodyBold"
              letterSpacing="1.5px"
              lineHeight={font.lineHeight}
              fontSize={font.size}
            />
            <StyledText
              text={constants.first.chooseText}
              type="bodyNormal"
              margin="50px 0 4px"
              letterSpacing="1.5px"
              lineHeight={font.lineHeight}
              fontSize={font.size}
            />
            <StyledContainer display="flex" flexDirection="row" gap="24px" padding={0}>
              <FirstOnBoardingOutlinedBox onClick={() => setDataType('user')}>
                <StyledImage src={userDataImg} margin="-24px 0 0 -12px" />
                <FirstOnBoardingBoxLabel lineHeight={font.lineHeight} fontSize={font.size}>
                  {constants.first.userDataBtnLabel}
                </FirstOnBoardingBoxLabel>
              </FirstOnBoardingOutlinedBox>
              <FirstOnBoardingOutlinedBox onClick={() => setDataType('demo')}>
                <StyledImage src={demoDataImg} />
                <FirstOnBoardingBoxLabel lineHeight={font.lineHeight} fontSize={font.size}>
                  {constants.first.demoDataBtnLabel}
                </FirstOnBoardingBoxLabel>
              </FirstOnBoardingOutlinedBox>
            </StyledContainer>
          </>
        )}
      </StyledContainer>
    </StyledContainer>
  );
};

export default FirstOnBoarding;
