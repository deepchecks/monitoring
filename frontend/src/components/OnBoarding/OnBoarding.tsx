import React, { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { OnBoardingDocsLink, OnBoardingStepperContainer } from './OnBoarding.styles';
import { StyledCodeSnippet } from 'components/lib';

import { regenerateApiTokenApiV1UsersRegenerateApiTokenGet } from 'api/generated';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { constants } from './onBoarding.constants';

interface OnBoardingProps {
  dataType?: 'demo' | 'user';
}

const OnBoarding = ({ dataType }: OnBoardingProps) => {
  const [activeStep, setActiveStep] = useState(1);
  const [apiToken, setApiToken] = useState('');

  const regenerateApiToken = () => {
    regenerateApiTokenApiV1UsersRegenerateApiTokenGet().then(value => {
      value ? setApiToken(value) : setApiToken('API_TOKEN');
    });
  };

  const buttonLabel = (i: number) => (i === constants.steps.length - 1 ? `Finish (${dataType})` : 'Continue');

  const handleNext = (i: number) => {
    i === constants.steps.length - 1
      ? window.location.replace('/')
      : setActiveStep((prevActiveStep: number) => prevActiveStep + 1);
  };

  useEffect(() => {
    regenerateApiToken();
  }, []);

  useEffect(() => {
    reportEvent(events.onBoarding.movedStep, { step: constants.steps[activeStep].title, dataType: 'Demo' });
  }, [activeStep]);

  return (
    <OnBoardingStepperContainer>
      <Stepper activeStep={activeStep} orientation="vertical">
        {constants.steps.map((step, i) => (
          <Step key={step.title}>
            <StepLabel>{step.title}</StepLabel>
            <StepContent>
              <Typography>{step.description}</Typography>
              <StyledCodeSnippet code={step.codeSnippet} />
              {step?.secondCodeSnippet() !== '' && <StyledCodeSnippet code={step.secondCodeSnippet(apiToken)} />}
              <OnBoardingDocsLink href={step.docLink.url} target="_blank" rel="noreferrer">
                {step.docLink.label}
              </OnBoardingDocsLink>
              <Box>
                <div>
                  <Button variant="contained" onClick={() => handleNext(i)}>
                    {buttonLabel(i)}
                  </Button>
                </div>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </OnBoardingStepperContainer>
  );
};

export default OnBoarding;
