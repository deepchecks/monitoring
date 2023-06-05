import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';

import { StyledText } from 'components/lib';
import Notifications from './Notifications/Notifications';
import Data from './Data/Data';

import { constants } from './integrations.constants';

const Integrations = () => {
  const [value, setValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => setValue(newValue);

  return (
    <Box padding="36px 8px" width="100%">
      <StyledText text={constants.integration.title} type="h1" marginBottom="36px" />
      <Box sx={{ borderBottom: 1, borderColor: theme => theme.palette.grey[200] }}>
        <Tabs
          sx={{ '& .MuiTabs-indicator': { height: '4px' }, '& .MuiTab-root': { textTransform: 'uppercase' } }}
          value={value}
          onChange={handleTabChange}
        >
          <Tab label={constants.tabs.notifications} />
          <Tab label={constants.tabs.data} />
        </Tabs>
      </Box>
      <Box marginY="32px">
        {value === 0 && <Notifications />}
        {value === 1 && <Data />}
      </Box>
    </Box>
  );
};

export default Integrations;
