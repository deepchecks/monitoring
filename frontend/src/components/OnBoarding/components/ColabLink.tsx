import React from 'react';

import { Tooltip } from '@mui/material';

import { StyledButton } from 'components/lib';

import AllInclusiveIcon from '@mui/icons-material/AllInclusive';

const constants = {
  text: 'Open With Colab',
  link: {
    demo: 'https://colab.research.google.com/drive/1M6-09zk5BI6ZrOC9Pns_yvVYRm20me5v#scrollTo=3mzmr6gfYBbK',
    user: 'https://colab.research.google.com/drive/1ND7O6aOj3aIEOsBrP-ENKperOvUuSZLQ#scrollTo=6ozMJDZcXunN'
  },
  localErrMsg: (isLocal: boolean) => `${isLocal ? 'Colab is not available via localhost' : ''}`
};

const ColabLink = ({
  dataType,
  reportOnboardingStep,
  isLocal
}: {
  dataType: 'user' | 'demo';
  isLocal: boolean;
  reportOnboardingStep: (src: string) => void;
}) => (
  <Tooltip title={constants.localErrMsg(isLocal)}>
    <div>
      <a
        href={constants.link[dataType]}
        target="_blank"
        rel="noreferrer"
        onClick={() => reportOnboardingStep('colab')}
        style={{ pointerEvents: isLocal ? 'none' : 'auto' }}
      >
        <StyledButton
          label={
            <>
              <AllInclusiveIcon />
              {constants.text}
            </>
          }
          sx={{ width: '240px', height: '44px' }}
          disabled={!!isLocal}
        />
      </a>
    </div>
  </Tooltip>
);

export default ColabLink;
