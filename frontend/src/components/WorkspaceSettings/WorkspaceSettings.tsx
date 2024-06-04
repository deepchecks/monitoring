import React, { useEffect, useState } from 'react';

import useUser from 'helpers/hooks/useUser';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import Members from './components/Members/Members';
import ModelsTab from './components/ModelsTab/ModelsTab';
import { Text } from 'components/lib/components/Text/Text';

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

const constants = {
  title: 'Workspace Settings',
  membersTabLabel: 'Users',
  modelsTabLabel: 'Models'
};

const WorkspaceSettings = () => {
  const [value, setValue] = useState(0);

  const { availableFeatures } = useUser();
  const modelAssignment = availableFeatures?.model_assignment;

  const { is_cloud } = getStorageItem(storageKeys.environment);

  useEffect(() => {
    setValue(!is_cloud ? 1 : 0);
  }, [is_cloud]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Text type="h1" margin="36px 0 27px" lineHeight="32.78px" text={constants.title} />
      <Box sx={{ borderBottom: 1, borderColor: theme => theme.palette.grey[200] }}>
        {is_cloud && (
          <Tabs
            sx={{ '& .MuiTabs-indicator': { height: '4px' }, '& .MuiTab-root': { textTransform: 'uppercase' } }}
            value={value}
            onChange={handleTabChange}
          >
            <Tab label={constants.membersTabLabel} />
            {modelAssignment && <Tab label={constants.modelsTabLabel} />}
          </Tabs>
        )}
      </Box>
      <Box sx={{ marginY: '32px' }}>
        {value === 0 && <Members />}
        {modelAssignment && value === 1 && <ModelsTab />}
      </Box>
    </Box>
  );
};

export default WorkspaceSettings;
