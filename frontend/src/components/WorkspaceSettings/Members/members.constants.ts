export const constants = {
  header: {
    title: 'Search member...'
  },
  table: {
    ariaLabel: 'organization members table',
    name: 'Name',
    email: 'Email address',
    activeSince: 'Active since',
    actions: 'Actions'
  },
  editMember: {
    title: 'Edit Member',
    submit: 'Save Changes',
    nameInputLabel: 'Name',
    emailInputLabel: 'Email address'
  },
  inviteMember: {
    title: 'Invite Member',
    submit: 'Send Invite',
    inputLabel: 'Email address of the invitee',
    success: 'User invited successfully!'
  },
  removeMember: {
    title: 'Remove Member',
    submit: 'Remove Member',
    messageStart: 'Are you sure you want to remove ',
    name: (name: string | undefined) => (name ? name : 'this member'),
    messageEnd: ' from the workspace?'
  }
};
