import React, { useEffect, useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

import { MemberSchema, retrieveOrganizationMembersApiV1OrganizationMembersGet } from 'api/generated';

import Billing from './Billing/Billing';
import NotAdminDialog from './NotAdminDialog/NotAdminDialog';
import BillingPaidSkeleton from './Billing/BillingPaidView/BillingPaidSkeleton';
import Members from './Members/Members';

import { StyledH1 } from 'components/base/Text/Header.styles';

const constants = {
  title: 'Workspace Settings',
  billingTabLabel: 'Billing',
  membersTabLabel: 'Members'
};

const WorkspaceSettings = () => {
  const [value, setValue] = useState(0);
  const [memberSettings, setMemberSettings] = useState<MemberSchema[]>();
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = memberSettings && memberSettings[0].is_admin;

  const getMemberSettings = async () => {
    const response = await retrieveOrganizationMembersApiV1OrganizationMembersGet();
    setMemberSettings(response);
    setIsLoading(false);
  };

  useEffect(() => void getMemberSettings(), []);

  if (!isAdmin) {
    return isLoading ? <BillingPaidSkeleton /> : <NotAdminDialog />;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <StyledH1 margin="24px 0 8px">{constants.title}</StyledH1>
      <Box sx={{ borderBottom: 1 }}>
        <Tabs value={value} onChange={handleTabChange}>
          <Tab label={constants.billingTabLabel} />
          <Tab label={constants.membersTabLabel} />
        </Tabs>
      </Box>
      <Box sx={{ marginY: '32px' }}>
        {value === 0 && <Billing />}
        {value === 1 && <Members />}
      </Box>
    </Box>
  );
};

export default WorkspaceSettings;
