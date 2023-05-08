import React, { useEffect, useState } from 'react';

import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Typography from '@mui/material/Typography';

import { OnBoardingDocsLink, OnBoardingStepperContainer } from './OnBoarding.styles';
import { StyledButton, StyledCodeSnippet } from 'components/lib';

import { getOnboardingStateApiV1OnboardingGet, regenerateApiTokenApiV1UsersRegenerateApiTokenGet } from 'api/generated';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { constants } from './onBoarding.constants';

interface OnBoardingProps {
  dataType?: 'demo' | 'user';
}

const OnBoarding = ({ dataType }: OnBoardingProps) => {
  const [activeStep, setActiveStep] = useState(1);
  const [apiToken, setApiToken] = useState('API_TOKEN');

  const regenerateApiToken = async () => {
    regenerateApiTokenApiV1UsersRegenerateApiTokenGet().then(value => {
      value && setApiToken(value);
    });
  };

  useEffect(() => {
    regenerateApiToken();
  }, []);

  useEffect(() => {
    reportEvent(events.onBoarding.movedStep, { step: constants.steps[activeStep].title, dataType: `${dataType}` });
  }, [activeStep]);

  useEffect((): void | (() => void) => {
    const handleUserStep = setInterval(async () => {
      const res = await getOnboardingStateApiV1OnboardingGet();

      if (res?.step < 3) {
        setActiveStep(res?.step);
      } else if (res?.step === 4) {
        () => window.location.replace('/');
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
              <Typography>{step.description}</Typography>
              <StyledCodeSnippet code={step.codeSnippet} />
              {step?.secondCodeSnippet() !== '' && <StyledCodeSnippet code={step.secondCodeSnippet(apiToken)} />}
              <OnBoardingDocsLink href={step.docLink.url} target="_blank" rel="noreferrer">
                {step.docLink.label}
              </OnBoardingDocsLink>
              {activeStep === 3 && <StyledButton label={'Skip'} onClick={() => window.location.replace('/')} />}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </OnBoardingStepperContainer>
  );
};

export default OnBoarding;
