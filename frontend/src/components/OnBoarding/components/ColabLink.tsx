import React from 'react';

import { StyledButton } from 'components/lib';

import AllInclusiveIcon from '@mui/icons-material/AllInclusive';

const constants = {
  text: 'Open with Colab',
  link: 'https://colab.research.google.com/drive/1M6-09zk5BI6ZrOC9Pns_yvVYRm20me5v#scrollTo=3mzmr6gfYBbK'
};

const ColabLink = () => (
  <a href={constants.link} target="_blank" rel="noreferrer">
    <StyledButton
      label={
        <>
          <AllInclusiveIcon />
          {constants.text}
        </>
      }
      sx={{ width: '240px', height: '44px' }}
    />
  </a>
);

export default ColabLink;
