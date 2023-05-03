import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { constants } from './onBoarding.constants';

interface OnBoardingProps {
  dataType?: 'demo' | 'user';
}

const OnBoarding = ({ dataType }: OnBoardingProps) => {
  const [activeStep, setActiveStep] = useState(1);
  console.log(dataType);
  const handleNext = () => setActiveStep((prevActiveStep: number) => prevActiveStep + 1);

  return (
    <Box margin="44px auto">
      <Stepper activeStep={activeStep} orientation="vertical">
        {constants.steps.map((step, index) => (
          <Step key={step.title}>
            <StepLabel>{step.title}</StepLabel>
            <StepContent>
              <Typography>{step.description}</Typography>
              <Typography>{step.codeSnippet}</Typography>
              <Typography>{step.docLink}</Typography>
              <Box>
                <div>
                  <Button variant="contained" onClick={handleNext}>
                    {index === constants.steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                </div>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default OnBoarding;
