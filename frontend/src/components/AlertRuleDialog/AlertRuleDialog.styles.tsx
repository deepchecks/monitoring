import { styled, Stack } from '@mui/material';
import { MUIBaseButton } from 'components/base/Button/MUIBaseButton';

const StyledContentContainer = styled(Stack)({
  justifyContent: 'center',
  flexDirection: 'column',
  alignItems: 'center'
});

const StyledButton = styled(MUIBaseButton)({
  width: '99px',
  height: '42px'
});

export { StyledContentContainer, StyledButton };
