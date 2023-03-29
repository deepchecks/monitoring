import React from 'react';
import { Button } from '@mui/material';

import { NotFoundContainer, NotFoundImg, NotFoundDescription, NotFoundTitle } from './NotFound.styles';

import imgLogo from 'assets/err/not-found.webp';

import { constants } from './notFound.constants';

const NotFound = () => (
  <NotFoundContainer>
    <NotFoundImg src={imgLogo} alt={constants.imgAlt} />
    <NotFoundTitle>{constants.title}</NotFoundTitle>
    <NotFoundDescription>{constants.description}</NotFoundDescription>
    <Button href={constants.button.link}>{constants.button.label}</Button>
  </NotFoundContainer>
);

export default NotFound;
