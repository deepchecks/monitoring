import React from 'react';

import { CircularProgress, CircularProgressProps } from '@mui/material';

import { Container } from '../Container/Container';
import { Image } from '../Image/Image';

export interface LoaderProps extends CircularProgressProps {
  margin?: string;
}

export const Loader = (props: LoaderProps) => {
  const { margin = '0' } = props;

  const logoImg = require('../../assets/logo/logo-purple.svg').default;

  return (
    <Container width="150px" height="150px" margin={margin}>
      <Image src={logoImg} alt="purple-logo" margin=" 0 0 -132px 18px" width="90px" />
      <CircularProgress {...props} size={'large'}></CircularProgress>
    </Container>
  );
};
