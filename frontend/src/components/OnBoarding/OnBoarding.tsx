import React, { useEffect, useState } from 'react';

import { useTheme } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';

import { OnBoardingDocsLink, OnBoardingStepperContainer } from './OnBoarding.styles';
import { StyledButton, StyledCodeSnippet, StyledText } from 'components/lib';

import { getOnboardingStateApiV1OnboardingGet, regenerateApiTokenApiV1UsersRegenerateApiTokenGet } from 'api/generated';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { constants } from './onBoarding.constants';

interface OnBoardingProps {
  dataType?: 'demo' | 'user';
  initialStep: number;
}

const OnBoarding = ({ dataType, initialStep }: OnBoardingProps) => {
  const theme = useTheme();

  const [activeStep, setActiveStep] = useState(initialStep);
  const [apiToken, setApiToken] = useState('API_TOKEN');

  const isLastStep = activeStep === 3;

  const redirectToDashboard = () => window.location.replace('/');

  const regenerateApiToken = async () => {
    regenerateApiTokenApiV1UsersRegenerateApiTokenGet().then(value => {
      value && setApiToken(value);
    });
  };

  useEffect(() => {
    activeStep === 1 && regenerateApiToken();
  }, []);

  useEffect(() => {
    reportEvent(events.onBoarding.movedStep, { step: constants.steps[activeStep].title, dataType: `${dataType}` });
  }, [activeStep]);

  useEffect((): void | (() => void) => {
    const handleUserStep = setInterval(async () => {
      const res = await getOnboardingStateApiV1OnboardingGet();

      if (res?.step < 4) {
        setActiveStep(res?.step);
      } else if (res?.step === 4) {
        redirectToDashboard();
      }
    }, 5000);

    return () => clearInterval(handleUserStep);
  }, [activeStep]);

  return (
    <OnBoardingStepperContainer>
      <Stepper activeStep={activeStep} orientation="vertical">
        {constants.steps.map(step => (
          <Step key={step.title}>
            <StepLabel>{step.title}</StepLabel>
            <StepContent>
              <StyledText text={step.description} color={theme.palette.grey[500]} />
              <StyledCodeSnippet code={step.codeSnippet} />
              {step?.secondCodeSnippet() !== '' && <StyledCodeSnippet code={step.secondCodeSnippet(apiToken)} />}
              <OnBoardingDocsLink href={step.docLink.url} target="_blank" rel="noreferrer">
                {step.docLink.label}
              </OnBoardingDocsLink>
              {isLastStep && <StyledButton label={constants.skipBtnLabel} onClick={redirectToDashboard} />}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </OnBoardingStepperContainer>
  );
};

export default OnBoarding;
