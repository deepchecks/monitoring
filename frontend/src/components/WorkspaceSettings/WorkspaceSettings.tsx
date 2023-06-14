import React, { useEffect, useState } from 'react';

import { RoleEnum } from 'api/generated';
import useUser from 'helpers/hooks/useUser';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import Billing from './components/Billing/Billing';
import Members from './components/Members/Members';
import ModelsTab from './components/ModelsTab/ModelsTab';
import NotAdminDialog from './components/PermissionError/NotAdminDialog';
import BillingPaidSkeleton from './components/Billing/BillingPaidView/BillingPaidSkeleton';
import NotOwnerMsg from './components/PermissionError/NotOwnerMsg';
import { Text } from 'components/lib/components/Text/Text';

import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

const constants = {
  title: 'Workspace Settings',
  billingTabLabel: 'Billing',
  membersTabLabel: 'Users',
  modelsTabLabel: 'Models'
};

const WorkspaceSettings = () => {
  const [value, setValue] = useState(0);

  const { user, isLoading, availableFeatures } = useUser();
  const modelAssignment = availableFeatures?.model_assignment;

  const { is_cloud } = getStorageItem(storageKeys.environment);

  useEffect(() => {
    setValue(!is_cloud ? 1 : 0);
  }, [is_cloud]);

  if (user && !user.roles.includes(RoleEnum.admin)) {
    return isLoading ? <BillingPaidSkeleton /> : <NotAdminDialog />;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const showBilling = user && user.roles.includes(RoleEnum.owner) && is_cloud;

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
            <Tab label={constants.billingTabLabel} />
          </Tabs>
        )}
      </Box>
      <Box sx={{ marginY: '32px' }}>
        {value === 0 && <Members />}
        {modelAssignment && value === 1 && <ModelsTab />}
        {value === (modelAssignment ? 2 : 1) && (showBilling ? <Billing /> : <NotOwnerMsg />)}
      </Box>
    </Box>
  );
};

export default WorkspaceSettings;
