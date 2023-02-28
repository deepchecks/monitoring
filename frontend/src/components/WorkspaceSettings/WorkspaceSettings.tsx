import React, { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import Billing from './Billing/Billing';

import { StyledH1 } from 'components/base/Text/Header.styles';

const WorkspaceSettings = () => {
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const a11yProps = (index: number) => ({
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  });

  return (
    <Box sx={{ width: '100%' }}>
      <StyledH1 margin="24px 0 8px">Workspace Settings</StyledH1>
      <Box sx={{ borderBottom: 1 }}>
        <Tabs value={value} onChange={handleChange}>
          <Tab label="Billing" {...a11yProps(0)} />
          <Tab label="Members" {...a11yProps(1)} />
        </Tabs>
      </Box>
      {value === 0 && <Billing />}
      {value === 1 && <p>Members Component</p>}
    </Box>
  );
};

export default WorkspaceSettings;
