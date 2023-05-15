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
    title: 'Invite Members',
    placeholder: 'email1@org-name.com, email2@org-name.com, email3@org-name.com, email4@org...',
    submit: 'Send Invite',
    inputLabel: 'Email address of the invitees',
    success: 'Users invited successfully!'
  },
  removeMember: {
    title: 'Remove Member',
    submit: 'Remove Member',
    messageStart: 'Are you sure you want to remove ',
    name: (name: string | undefined) => (name ? name : 'this member'),
    messageEnd: ' from the workspace?'
  },
  deleteWorkspace: {
    title: 'Workspace Settings',
    description: 'Lorem ipsum dolor sit amet consectetur. Tempor egestas massa aliquam eu ut.',
    deleteWorkspace: 'Delete Workspace',
    dialogMessage: 'Are you sure want to delete current workspace?',
    dialogSubmitButtonLabel: 'Yes, delete'
  }
};
