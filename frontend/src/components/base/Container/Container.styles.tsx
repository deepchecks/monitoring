import styled from 'styled-components';

interface ContainerProps {
  width?: string;
  margin?: string;
  height?: string;
}

const FlexContainer = styled.div<ContainerProps>`
  display: flex;
  width: 100%;
  margin: ${p => p.margin ?? ''};
`;

const FlexRowContainer = styled.div<ContainerProps>`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: ${p => p.width ?? ''};
  height: ${p => p.height ?? ''};
`;

const FlexColumnContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const HiddenContainer = styled.div`
  display: none;
`;

const Row8Gap = styled(FlexRowContainer)<ContainerProps>`
  gap: 8px;
  width: ${p => p.width ?? ''};
  height: ${p => p.height ?? ''};
`;

const Col8Gap = styled(FlexColumnContainer)`
  gap: 8px;
`;

const Row16Gap = styled(FlexRowContainer)<ContainerProps>`
  gap: 16px;
  width: ${p => p.width ?? ''};
  height: ${p => p.height ?? ''};
`;

const Col16Gap = styled(FlexColumnContainer)`
  gap: 16px;
`;

const RowAutoGap = styled(FlexRowContainer)`
  justify-content: space-between;
  border-radius: 14px;
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
  box-shadow: 0px 3px 8px 2px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
`;

export {
  FlexContainer,
  FlexRowContainer,
  FlexColumnContainer,
  Row8Gap,
  Col8Gap,
  Row16Gap,
  Col16Gap,
  RowAutoGap,
  ImageContainer,
  HiddenContainer,
  ShadowContainer
};
