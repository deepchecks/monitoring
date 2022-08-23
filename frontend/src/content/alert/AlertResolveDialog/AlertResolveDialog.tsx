import { Button, DialogProps, Stack, Typography } from "@mui/material";
import { CloseIcon } from "../../../assets/icon/icon";
import { useTypedSelector } from "../../../store/hooks";
import { alertSelector } from "../../../store/slices/alert/alertSlice";
import { ID } from "../../../types";
import {
  StyledButtonContinue,
  StyledButtonWrapper,
  StyledDialog,
  StyledHeader,
  StyledIconButton,
  StyledTypographyMessage,
} from "./AlertResolveDialog.style";

interface AlertResolveDialogProps extends DialogProps {
  onClose: () => void;
  resolve: (alertRuleId: ID) => void;
}

export function AlertResolveDialog({
  resolve,
  ...props
}: AlertResolveDialogProps) {
  const { alertRule } = useTypedSelector(alertSelector);

  const resolveAlerts = () => {
    resolve(alertRule.id);
  };

  return (
    <StyledDialog {...props}>
      <StyledHeader>
        <Typography variant="h4">Resolve All</Typography>
        <StyledIconButton onClick={props.onClose}>
          <CloseIcon />
        </StyledIconButton>
      </StyledHeader>
      <StyledTypographyMessage>
        You are about to resolve <b>{alertRule?.alerts_count} active alerts</b>{" "}
        for all the system blah blah blah. are you sure you want to do this?
      </StyledTypographyMessage>
      <StyledButtonWrapper>
        <Stack direction="row" spacing="20px">
          <Button variant="outlined" onClick={props.onClose}>
            No, cancel
          </Button>
          <StyledButtonContinue variant="contained" onClick={resolveAlerts}>
            Yes, continue
          </StyledButtonContinue>
        </Stack>
      </StyledButtonWrapper>
    </StyledDialog>
  );
}
