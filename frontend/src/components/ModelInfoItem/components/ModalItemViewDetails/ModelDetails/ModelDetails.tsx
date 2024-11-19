import React, { useState } from 'react';

import { Tab } from '@mui/material';
import { TabContext } from '@mui/lab';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';

import { ConnectedModelSchema } from 'api/generated';

import { ModelLogs } from './components/ModelLogs/ModelLogs';
import { ModelNotes } from './components/ModelNotes';
import { StyledModalTitle, StyledModalTitleText } from '../ModalItemViewDetails.style';
import { theme } from 'components/lib/theme';

interface ModelDetailsProps {
  model: ConnectedModelSchema;
}

const constants = {
  title: (modelName: string) => `${modelName} Details`,
  versionTabLabel: 'All Versions Logs',
  notesTabLabel: 'My Notes'
};

export const ModelDetails = ({ model }: ModelDetailsProps) => {
  const [value, setValue] = useState('1');

  return (
    <>
      <StyledModalTitle>
        <StyledModalTitleText>{constants.title(model.name)}</StyledModalTitleText>
      </StyledModalTitle>
      <TabContext value={value}>
        <TabList
          value={value}
          onChange={(_event: React.SyntheticEvent, newValue: string) => setValue(newValue)}
          sx={{ borderBottom: `solid 1px ${theme.palette.grey.light}` }}
        >
          <Tab label={constants.versionTabLabel} value="1" />
          <Tab label={constants.notesTabLabel} value="2" />
        </TabList>
        <TabPanel value="1" sx={{ padding: '0' }}>
          <ModelLogs modelId={model.id} />
        </TabPanel>
        <TabPanel value="2" sx={{ padding: '0' }}>
          <ModelNotes model={model} />
        </TabPanel>
      </TabContext>
    </>
  );
};
