import React from 'react';

import { Button } from '@mui/material';

import { StyledImage } from 'components/lib';

import logoImg from '../../../assets/onBoarding/colab.svg';

const constants = {
  text: 'Open with Colab',
  link: 'https://colab.research.google.com/drive/1M6-09zk5BI6ZrOC9Pns_yvVYRm20me5v#scrollTo=6ozMJDZcXunN'
};

const ColabLink = () => (
  <a href={constants.link} target="_blank" rel="noreferrer" style={{ width: '240px' }}>
    <Button
      variant="outlined"
      sx={{
        background: 'rgba(121, 100, 255, 0.2)',
        width: '240px',
        borderColor: '#7964FF',
        borderRadius: '12px',
        paddingRight: '36px',

        '&:hover': { background: 'rgba(121, 100, 255, 0.15)' }
      }}
    >
      <StyledImage src={logoImg} width="34px" height="34px" margin="0 16px 0 0" />
      {constants.text}
    </Button>
  </a>
);

export default ColabLink;
