import { customInstance } from './customAxios';

interface completeDetailsProps {
  organization: string;
  fullName: string;
}

export const postCompleteDetails = async (completeDetails: completeDetailsProps) => {
  const { organization = '', fullName = '' } = completeDetails;
  // TODO: use react query here.
  try {
    await customInstance({
      method: 'POST',
      data: { user_full_name: fullName, new_organization_name: organization },
      url: '/api/v1/users/complete-details'
    });
    window.location.href = '/';
  } catch (e) {
    console.log('error occurred,', e);
  }
};
