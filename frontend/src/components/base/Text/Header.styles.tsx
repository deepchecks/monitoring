import styled from 'styled-components';

interface Props {
  margin?: string;
  color?: string;
}

const StyledH1 = styled.h1<Props>`
  margin: ${p => p.margin ?? '0'};
  font-size: 1.5rem;
`;

const StyledH2 = styled.h2`
  font-size: 1.5rem;
  text-align: center;
  margin: 0;
`;

const StyledH3 = styled.h3`
  font-size: 1.25rem;
  margin: 0;
  line-height: 1;
  width: 100%;
`;

const StyledH4 = styled.h4`
  font-size: 1.5rem;
  margin: 0;
`;

const StyledH5 = styled.h5`
  font-size: 1.125rem;
  letter-spacing: -0.15px;
  line-height: 1;
  margin: 0;
  text-align: left;
`;

const StyledH6 = styled.h6<Props>`
  color: ${p => p.color ?? 'gray'};
  font-size: 1rem;
  margin: 0;
  line-height: 1.4;
  letter-spacing: -0.1px;
  white-space: pre-line;
`;

export { StyledH1, StyledH2, StyledH3, StyledH4, StyledH5, StyledH6 };
