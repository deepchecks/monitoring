import React from 'react';

import { StyledButton, StyledImage } from 'components/lib';

import logoImg from '../../../assets/onBoarding/colab.svg';

const constants = {
  text: 'Open with Colab',
  link: 'https://colab.research.google.com/drive/1M6-09zk5BI6ZrOC9Pns_yvVYRm20me5v#scrollTo=6ozMJDZcXunN'
};

const ColabLink = () => (
  <a href={constants.link} target="_blank" rel="noreferrer">
    <StyledButton
      label={
        <>
          <StyledImage src={logoImg} width="36px" height="36px" margin="0 16px 0 -8px" />
          {constants.text}
        </>
      }
      sx={{ width: '240px', borderRadius: '16px' }}
    />
  </a>
);

export default ColabLink;
