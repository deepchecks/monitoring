import { Box, Step, StepLabel, Stepper } from "@mui/material";
import React from "react";
import { AlertRuleDialogStepOne } from "./RuleDialogStepOne";
import { AlertRuleDialogStepThree } from "./RuleDialogStepThree";
import { AlertRuleDialogStepTwo } from "./RuleDialogStepTwo";


const steps = ['Basic Details', 'Monitor Data', 'Alert Logic'];

interface AlertRuleDialogContentProps {
    handleComplete: () => void;
}

export interface AlertRuleStepBaseProps {
    handleNext: () => void;
    handleBack?: () => void;
}

export const AlertRuleDialogContent = ({handleComplete} : AlertRuleDialogContentProps) => {
    const [activeStep, setActiveStep] = React.useState(0);

    const handleNext = () => {
        activeStep === steps.length -1 ? handleComplete() : setActiveStep(activeStep + 1);
      };
    
    const handleBack = () => setActiveStep(prevActiveStep => prevActiveStep - 1);


    const renderStep = () => {
        switch(activeStep) {
            case 0:
                return <AlertRuleDialogStepOne handleNext={handleNext}/>
            case 1:
                return <AlertRuleDialogStepTwo handleNext={handleNext} handleBack={handleBack}/>
            case 2:
                return <AlertRuleDialogStepThree handleNext={handleNext} handleBack={handleBack}/>
            default:
                return null;
        }
    };
    return (
        <Box sx={{ width: '100%', maxWidth: '1200px', ml: 'auto', mr: 'auto', justifyContent: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '90vh' }}>
            <Stepper activeStep={activeStep} sx={{width: '50%'}}>
                {steps.map(label => (
                <Step key={label}>
                    <StepLabel color="inherit">
                    {label}
                    </StepLabel>
                </Step>
                ))}
            </Stepper>
            <>
                <Box sx={{ pt: 2, width: '100%' }}>
                    <Box>
                        {renderStep()}
                    </Box>
                </Box>
            </>
        </Box>
    )

};