import { FlexColumnContainer } from 'components/base/Container/Container.styles';
import { StyledH1 } from 'components/base/Text/Header.styles';
import styled from 'styled-components';
import { theme } from 'components/lib/theme';

const NotFoundContainer = styled(FlexColumnContainer)`
  width: 100vw;
  height: 100vh;
  background: ${theme.palette.common.white};
`;

const NotFoundImg = styled.img`
  margin: 10vh auto 0;
  width: 50vw;
  height: 50vh;
`;

const NotFoundTitle = styled(StyledH1)`
  text-decoration: none;
  color: ${theme.palette.primary.dark};
  font-weight: 900;
  font-size: 3rem;
  margin: 24px auto;
`;

const NotFoundDescription = styled.p`
  text-decoration: none;
  color: ${theme.palette.primary.main};
  font-size: 1.25rem;
  margin: 16px 0 28px;
`;

export { NotFoundContainer, NotFoundImg, NotFoundDescription, NotFoundTitle };
