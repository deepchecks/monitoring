import React, { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import Billing from './Billing/Billing';

import { StyledH1 } from 'components/base/Text/Header.styles';

const constants = {
  title: 'Workspace Settings',
  billingTabLabel: 'Billing',
  membersTabLabel: 'Members'
};

const WorkspaceSettings = () => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <StyledH1 margin="24px 0 8px">{constants.title}</StyledH1>
      <Box sx={{ borderBottom: 1 }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label={constants.billingTabLabel} />
          <Tab label={constants.membersTabLabel} />
        </Tabs>
      </Box>
      {value === 0 && <Billing />}
      {value === 1 && <p>Members Component</p>}
    </Box>
  );
};

export default WorkspaceSettings;
