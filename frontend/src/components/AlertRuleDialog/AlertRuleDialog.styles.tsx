import { styled, Stack, Dialog, Box, Step } from '@mui/material';
import { MUIBaseButton } from 'components/base/Button/MUIBaseButton';

const StyledDialog = styled(Dialog)({
  '& .MuiDialog-paper': { width: '603px', padding: '40px 32px', borderRadius: '20px' }
});

const StyledContentContainer = styled(Stack)({
  justifyContent: 'center',
  flexDirection: 'column',
  alignItems: 'center'
});

const StyledButton = styled(MUIBaseButton)({
  width: '99px',
  height: '42px'
});

const StyledStepContainer = styled(Box)({
  marginTop: '38px',
  justifyContent: 'start',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
});

const StyledStep = styled(Step)(({ theme }) => ({
  '& .MuiStepIcon-root': {
    color: theme.palette.grey.light
  },

  '& .MuiStepLabel-root': {
    color: theme.palette.primary.main,

    '& .Mui-active': {
      color: theme.palette.primary.main,

      '& .MuiStepIcon-text': {
        fill: theme.palette.common.white
      }
    },

    '& .Mui-completed': {
      color: theme.palette.grey.light
    },

    '& .MuiStepIcon-text': {
      fill: theme.palette.text.disabled,
      fontSize: '14px',
      fontWeight: 600
    }
  },

  '& .MuiStepLabel-label': {
    color: theme.palette.text.disabled,
    fontWeight: 600
  }
}));

export { StyledContentContainer, StyledButton, StyledDialog, StyledStepContainer, StyledStep };
