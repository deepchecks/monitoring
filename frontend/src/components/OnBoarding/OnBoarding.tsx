import React, { useEffect, useState } from 'react';

import { useTheme } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';

import { OnBoardingAdditionalContainer, OnBoardingDocsLink, OnBoardingStepperContainer } from './OnBoarding.styles';
import { StyledButton, StyledCodeSnippet, StyledText } from 'components/lib';

import { getOnboardingStateApiV1OnboardingGet, regenerateApiTokenApiV1UsersRegenerateApiTokenGet } from 'api/generated';

import { events, reportEvent } from 'helpers/services/mixPanel';
import { removeStorageItem, storageKeys } from 'helpers/utils/localStorage';

import DownloadNotebook from './components/DownloadNotebook';
import ColabLink from './components/ColabLink';
import GenerateToken from './components/GenerateToken';
import DownloadScript from './components/DownloadScript';

import { constants } from './onBoarding.constants';

interface OnBoardingProps {
  dataType: 'demo' | 'user';
  initialStep: number;
}

const OnBoarding = ({ dataType, initialStep }: OnBoardingProps) => {
  const theme = useTheme();

  const [activeStep, setActiveStep] = useState(initialStep);
  const [apiToken, setApiToken] = useState('API_TOKEN');

  const isLastStep = activeStep === 3;
  const isLocal = window.location.href.includes('localhost');

  const redirectToDashboard = () => window.location.replace('/');

  const reportOnboardingStep = (source?: string) => {
    reportEvent(events.onBoarding.onboarding, {
      step_name: source ? 'source click' : constants[dataType].steps[activeStep].title,
      step_number: source ? 0 : activeStep,
      type: `${dataType}`,
      'click source': source ?? 'none'
    });
  };

  const regenerateApiToken = async () => {
    regenerateApiTokenApiV1UsersRegenerateApiTokenGet().then(value => {
      value && setApiToken(value);
      navigator.clipboard.writeText(value);
    });
  };

  useEffect(() => {
    activeStep === 1 && regenerateApiToken();
  }, []);

  useEffect(() => reportOnboardingStep(), [activeStep]);

  useEffect((): void | (() => void) => {
    const handleUserStep = setInterval(async () => {
      const res = await getOnboardingStateApiV1OnboardingGet();

      if (res?.step < 4) {
        setActiveStep(res?.step);
      } else if (res?.step === 4) {
        removeStorageItem(storageKeys.is_onboarding);
        redirectToDashboard();
      }
    }, 5000);

    return () => clearInterval(handleUserStep);
  }, [activeStep]);

  return (
    <OnBoardingStepperContainer>
      <Stepper activeStep={activeStep} orientation="vertical">
        {constants[dataType].steps.map(step => (
          <Step key={step.title}>
            <StepLabel>{step.title}</StepLabel>
            <StepContent>
              <StyledText text={step.description} color={theme.palette.grey[500]} type="h3" />
              <StyledCodeSnippet code={step.codeSnippet} />
              {step?.secondCodeSnippet() !== '' && <StyledCodeSnippet code={step.secondCodeSnippet(apiToken)} />}
              <OnBoardingDocsLink href={step.docLink.url} target="_blank" rel="noreferrer">
                {step.docLink.label}
              </OnBoardingDocsLink>
              {isLastStep && (
                <StyledButton label={constants.skipBtnLabel} onClick={redirectToDashboard} variant="outlined" />
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>
      <OnBoardingAdditionalContainer>
        <DownloadScript dataType={dataType} token={apiToken} reportOnboardingStep={reportOnboardingStep} />
        <DownloadNotebook dataType={dataType} token={apiToken} reportOnboardingStep={reportOnboardingStep} />
        <ColabLink dataType={dataType} reportOnboardingStep={reportOnboardingStep} isLocal={isLocal} />
        <GenerateToken regenerateApiToken={regenerateApiToken} isLocal={isLocal} apiToken={apiToken} />
      </OnBoardingAdditionalContainer>
    </OnBoardingStepperContainer>
  );
};

export default OnBoarding;
