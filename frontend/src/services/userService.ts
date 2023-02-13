import mixpanel from 'mixpanel-browser';
import { customInstance } from './customAxios';

interface completeDetailsProps {
  organization: string;
  fullName: string;
}

interface completeDetailsAndAcceptInvite {
  acceptInvite: true;
  fullName: string;
}

export const postCompleteDetails = async (completeDetails: completeDetailsProps) => {
  const { organization, fullName } = completeDetails;

  await customInstance({
    method: 'POST',
    data: { user_full_name: fullName, new_organization_name: organization },
    url: '/api/v1/users/complete-details'
  });

  mixpanel.track('Sign Up', {
    'From invitation': false,
    'Org name': organization,
    'Full name': fullName
  });

  window.location.href = '/';
};

export const postCompleteDetailsAndAcceptInvite = async (completeDetails: completeDetailsAndAcceptInvite) => {
  const { fullName, acceptInvite } = completeDetails;

  await customInstance({
    method: 'POST',
    data: { user_full_name: fullName, accept_invite: acceptInvite },
    url: '/api/v1/users/complete-details'
  });

  mixpanel.track('Sign Up', {
    'From invitation': true,
    'Full name': fullName,
    'Accept Invite': acceptInvite
  });

  window.location.href = '/';
};
