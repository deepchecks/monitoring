import React, { Box, Button, Dialog, DialogProps, IconButton, Stack, styled, Typography } from '@mui/material';
import { AlertRuleInfoSchema } from '../api/generated';
import { CloseIcon } from '../assets/icon/icon';
import { Loader } from './Loader';

interface AlertsResolveDialogProps extends DialogProps {
  alertRule: AlertRuleInfoSchema | null;
  isLoading: boolean;
  onClose: () => void;
  onResolve: () => void;
}

export const AlertsResolveDialog = ({ alertRule, onResolve, isLoading, ...props }: AlertsResolveDialogProps) => (
  <StyledDialog {...props}>
    {isLoading ? (
      <Loader />
    ) : (
      <>
        <StyledHeader>
          <Typography variant="h4">Resolve All</Typography>
          <StyledIconButton onClick={props.onClose}>
            <CloseIcon />
          </StyledIconButton>
        </StyledHeader>
        <StyledTypographyMessage>
          You are about to resolve <strong>{alertRule?.alerts_count} active alerts</strong> for all the system blah blah
          blah. are you sure you want to do this?
        </StyledTypographyMessage>
        <StyledButtonWrapper>
          <Stack direction="row" spacing="20px">
            <Button variant="outlined" onClick={props.onClose}>
              No, cancel
            </Button>
            <StyledButtonContinue variant="contained" onClick={onResolve}>
              Yes, continue
            </StyledButtonContinue>
          </Stack>
        </StyledButtonWrapper>
      </>
    )}
  </StyledDialog>
);

const StyledDialog = styled(Dialog)({
  '& .MuiPaper-root': {
    padding: '18px 12px 30px 30px',
    width: 500
  }
});

const StyledHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
});

const StyledIconButton = styled(IconButton)({
  background: 'transparent'
});

const StyledTypographyMessage = styled(Typography)({
  margin: '55px 0 56px'
});

const StyledButtonWrapper = styled(Box)({
  display: 'flex',
  justifyContent: 'end'
});

const StyledButtonContinue = styled(Button)({
  width: 158
});
