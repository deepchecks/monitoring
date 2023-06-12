import React from 'react';

import { StyledButton } from 'components/lib';

import AllInclusiveIcon from '@mui/icons-material/AllInclusive';

const constants = {
  text: 'Open with Colab',
  link: {
    demo: 'https://colab.research.google.com/drive/1M6-09zk5BI6ZrOC9Pns_yvVYRm20me5v#scrollTo=3mzmr6gfYBbK',
    user: 'https://colab.research.google.com/drive/1ND7O6aOj3aIEOsBrP-ENKperOvUuSZLQ#scrollTo=6ozMJDZcXunN'
  }
};

const ColabLink = ({
  dataType,
  reportOnboardingStep
}: {
  dataType: 'user' | 'demo';
  reportOnboardingStep: (src: string) => void;
}) => (
  <a href={constants.link[dataType]} target="_blank" rel="noreferrer" onClick={() => reportOnboardingStep('colab')}>
    <StyledButton
      label={
        <>
          <AllInclusiveIcon />
          {constants.text}
        </>
      }
      sx={{ width: '280px', height: '44px' }}
    />
  </a>
);

export default ColabLink;
