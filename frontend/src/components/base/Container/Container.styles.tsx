import styled from 'styled-components';
import { breakpointOptions } from 'theme/breakpoints';

const FlexContainer = styled.div`
  display: flex;
`;

const FlexRowContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

const FlexColumnContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const HiddenContainer = styled.div`
  display: none;
`;

const Row8Gap = styled(FlexRowContainer)`
  gap: 8px;
`;

const Col8Gap = styled(FlexColumnContainer)`
  gap: 8px;
`;

const Row16Gap = styled(FlexRowContainer)`
  gap: 16px;
`;

const Col16Gap = styled(FlexColumnContainer)`
  gap: 16px;
`;

interface ImageContainerProps {
  bgImage?: string;
}

const ImageContainer = styled.div<ImageContainerProps>`
  background-image: url(${p => p.bgImage});
  background-position: center;
  background-size: cover;
`;

const ShadowContainer = styled(FlexColumnContainer)`
  padding: 16px;

  ${breakpointOptions.values?.lg} {
    box-shadow: 0px 3px 8px 2px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
  }
`;

export {
  FlexContainer,
  FlexRowContainer,
  FlexColumnContainer,
  Row8Gap,
  Col8Gap,
  Row16Gap,
  Col16Gap,
  ImageContainer,
  HiddenContainer,
  ShadowContainer
};
