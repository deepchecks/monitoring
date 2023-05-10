import React, { useEffect, useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import { MemberSchema, retrieveOrganizationMembersApiV1OrganizationMembersGet } from 'api/generated';

import Billing from './Billing/Billing';
import Members from './Members/Members';
import NotAdminDialog from './NotAdminDialog/NotAdminDialog';
import BillingPaidSkeleton from './Billing/BillingPaidView/BillingPaidSkeleton';
import { Text } from 'components/lib/components/Text/Text';

import { resError } from 'helpers/types/resError';
import { getStorageItem, storageKeys } from 'helpers/utils/localStorage';

const constants = {
  title: 'Workspace Settings',
  billingTabLabel: 'Billing',
  membersTabLabel: 'Members'
};

const WorkspaceSettings = () => {
  const [value, setValue] = useState(0);
  const [memberSettings, setMemberSettings] = useState<MemberSchema[]>();
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = memberSettings && memberSettings[0]?.is_admin;

  const getMemberSettings = async () => {
    const response = await retrieveOrganizationMembersApiV1OrganizationMembersGet();

    if (response) {
      if ((response as unknown as resError).error_message) {
        setIsLoading(false);
      } else {
        setMemberSettings(response);
        setIsLoading(false);
      }
    }
  };

  const { is_cloud } = getStorageItem(storageKeys.environment);

  useEffect(() => void getMemberSettings(), []);

  useEffect(() => {
    setValue(!is_cloud ? 1 : 0);
  }, [is_cloud]);

  if (!isAdmin) {
    return isLoading ? <BillingPaidSkeleton /> : <NotAdminDialog />;
  }

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
            <Tab label={constants.billingTabLabel} />
            <Tab label={constants.membersTabLabel} />
          </Tabs>
        )}
      </Box>
      <Box sx={{ marginY: '32px' }}>
        {value === 0 && is_cloud && <Billing />}
        {value === 1 && <Members />}
      </Box>
    </Box>
  );
};

export default WorkspaceSettings;
