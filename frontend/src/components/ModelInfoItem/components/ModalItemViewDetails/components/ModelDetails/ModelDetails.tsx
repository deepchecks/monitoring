import React, { useState } from 'react';

import { Tab } from '@mui/material';
import { TabContext } from '@mui/lab';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';

import { ConnectedModelSchema } from 'api/generated';

import { ModelLogs } from './components/ModelLogs/ModelLogs';
import { ModelNotes } from './components/ModelNotes';
import { StyledModalTitle, StyledModalTitleText } from '../../ModalItemViewDetails.style';
import { theme } from 'components/lib/theme';

interface ModelDetailsProps {
  model: ConnectedModelSchema;
}

export const ModelDetails = ({ model }: ModelDetailsProps) => {
  const [value, setValue] = useState('1');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => setValue(newValue);

  return (
    <>
      <StyledModalTitle>
        <StyledModalTitleText>{model.name}</StyledModalTitleText>
      </StyledModalTitle>
      <TabContext value={value}>
        <TabList
          value={value}
          onChange={handleTabChange}
          sx={{ borderBottom: `solid 1px ${theme.palette.grey.light}` }}
        >
          <Tab label="All Versions Logs" value="1" color={theme.palette.text.disabled} />
          <Tab label="My notes" value="2" color={theme.palette.text.disabled} />
        </TabList>
        <TabPanel value="1" sx={{ padding: '0' }}>
          <ModelLogs />
        </TabPanel>
        <TabPanel value="2" sx={{ padding: '0' }}>
          <ModelNotes model={model} />
        </TabPanel>
      </TabContext>
    </>
  );
};
