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
  // TODO: use react query here.
  try {
    const res = await customInstance({
      method: 'POST',
      data: { user_full_name: fullName, new_organization_name: organization },
      url: '/api/v1/users/complete-details'
    });
    window.location.href = '/';
    console.log('res inside userService', res);
  } catch (e) {
    console.log('error occurred,', e);
  }
};

export const postCompleteDetailsAndAcceptInvite = async (completeDetails: completeDetailsAndAcceptInvite) => {
  const { fullName, acceptInvite } = completeDetails;
  try {
    const res = await customInstance({
      method: 'POST',
      data: { user_full_name: fullName, accept_invite: acceptInvite },
      url: '/api/v1/users/complete-details'
    });
    console.log('res inside userService', res);

    window.location.href = '/';
  } catch (e) {
    console.log('error occurred,', e);
  }
};
