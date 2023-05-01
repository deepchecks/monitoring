export interface AlertRuleStepBaseProps {
  activeStep: number;
  handleNext: () => void;
  handleBack?: () => void;
}
