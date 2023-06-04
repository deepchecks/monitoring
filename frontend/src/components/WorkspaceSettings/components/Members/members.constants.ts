import dayjs from 'dayjs';

export const constants = {
  header: {
    title: 'Search user...',
    removeMembers: 'Remove Users',
    inviteMembers: 'Invite Users'
  },
  table: {
    ariaLabel: 'organization users table',
    name: 'Name',
    email: 'Email address',
    activeSince: 'Active since',
    role: 'Role',
    modelAccess: 'Model access',
    actions: 'Actions',
    roles: {
      member: 'Member',
      admin: 'Admin',
      owner: 'Owner'
    },
    allModels: 'All models',
    assignModels: 'Assign models'
  },
  editMember: {
    title: 'Edit User',
    submit: 'Save Changes',
    nameInputLabel: 'Name',
    emailInputLabel: 'Email address',
    role: 'Role'
  },
  inviteMember: {
    placeholder: 'email1@org-name.com, email2@org-name.com, email3@org-name.com, email4@org...',
    submit: 'Invite Users',
    add: 'Add Users',
    inputLabel: 'Email address of the invitees',
    success: 'Users invited successfully!',
    mailConfigErr:
      'Email is not configured, learn how to configure it on our docs. \n At the meantime, you can add users and send them the deployment URL to login.' // TODO - Update to a link once we have it on docs
  },
  removeMember: {
    title: 'Remove User',
    submit: 'Remove User',
    messageStart: 'Are you sure you want to remove ',
    name: (name: string | undefined) => (name ? name : 'this User'),
    messageEnd: ' from the workspace?'
  },
  removeSelectedMembers: {
    title: 'Remove Users',
    submit: 'Remove Users',
    messageStart: 'Are you sure you want to remove ',
    messageEnd: ' from the workspace?',
    allMembers: 'all users'
  },
  deleteWorkspace: {
    title: 'Workspace Settings',
    description: 'Delete your account along with all other users accounts.',
    deleteWorkspace: 'Delete Workspace',
    dialogMessage1: 'Deleting the workspace will erase all data and is irreversible.',
    dialogMessage2: 'Please confirm this by writing the workspace name below.',
    inputPlaceholder: 'Workspace name',
    dialogSubmitButtonLabel: 'Yes, delete'
  },
  assignModels: {
    title: 'Assign Models',
    submitButtonLabel: 'Assign',
    searchfieldPlaceholder: 'Search models...',
    dialogListItemSubtitle: (subtitle: number | undefined) =>
      `Last data update: ${subtitle ? dayjs(subtitle).format('ll') : '-'}`
  }
};
