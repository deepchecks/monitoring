import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { OnBoardingDocsLink, OnBoardingStepperContainer } from './OnBoarding.styles';
import { StyledCodeSnippet } from 'components/lib';

import { constants } from './onBoarding.constants';

interface OnBoardingProps {
  dataType?: 'demo' | 'user';
}

const OnBoarding = ({ dataType }: OnBoardingProps) => {
  const [activeStep, setActiveStep] = useState(1);

  const handleNext = () => setActiveStep((prevActiveStep: number) => prevActiveStep + 1);

  const buttonLabel = (i: number) => (i === constants.steps.length - 1 ? `Finish (${dataType})` : 'Continue');

  return (
    <OnBoardingStepperContainer>
      <Stepper activeStep={activeStep} orientation="vertical">
        {constants.steps.map((step, i) => (
          <Step key={step.title}>
            <StepLabel>{step.title}</StepLabel>
            <StepContent>
              <Typography>{step.description}</Typography>
              <StyledCodeSnippet code={step.codeSnippet} />
              <OnBoardingDocsLink href={step.docLink.url}>{step.docLink.label}</OnBoardingDocsLink>
              <Box>
                <div>
                  <Button variant="contained" onClick={handleNext}>
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
