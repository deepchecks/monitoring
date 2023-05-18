export const constants = {
  header: {
    title: 'Search member...',
    assignModels: 'Assign Model',
    removeMembers: 'Remove Members',
    inviteMembers: 'Invite members'
  },
  table: {
    ariaLabel: 'organization members table',
    name: 'Name',
    email: 'Email address',
    activeSince: 'Active since',
    role: 'Role',
    actions: 'Actions',
    roles: {
      member: 'Member',
      admin: 'Admin',
      owner: 'Owner'
    }
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
  removeSelectedMembers: {
    title: 'Remove Members',
    submit: 'Remove Members',
    messageStart: 'Are you sure you want to remove ',
    messageEnd: ' from the workspace?',
    allMembers: 'all members'
  },
  deleteWorkspace: {
    title: 'Workspace Settings',
    description: 'Delete your account along with all other members accounts.',
    deleteWorkspace: 'Delete Workspace',
    dialogMessage1: 'Deleting the workspace will erase all data and is irreversible.',
    dialogMessage2: 'Please confirm this by writing the workspace name below.',
    inputPlaceholder: 'Workspace name',
    dialogSubmitButtonLabel: 'Yes, delete'
  }
};
