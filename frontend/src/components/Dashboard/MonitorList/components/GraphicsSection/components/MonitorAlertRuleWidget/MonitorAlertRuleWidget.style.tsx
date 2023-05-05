import { Typography, styled } from '@mui/material';
import { FlexRowContainer } from 'components/base/Container/Container.styles';

const StyledContainer = styled(FlexRowContainer)({
  marginTop: 'auto',
  paddingTop: '16px'
});

const StyledTypography = styled(Typography)({
  marginLeft: '5px',
  fontSize: '14px'
});

interface ColorOptions {
  color: string;
}

const StyledSeverity = styled(Typography, {
  shouldForwardProp: prop => prop !== 'color'
})<ColorOptions>(({ color }) => ({
  display: 'inline-block',
  fontWeight: 600,
  color,
  fontSize: '14px'
})) as typeof Typography;

export { StyledContainer, StyledTypography, StyledSeverity };
