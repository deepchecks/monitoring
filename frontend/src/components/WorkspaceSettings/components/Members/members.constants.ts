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
    copy: 'Copy URL',
    inputLabel: 'Email address of the invitees',
    success: 'Users invited successfully!',
    mailConfigErr: {
      first: 'Email server is not configured, learn how to configure it',
      second: ' here.',
      third: 'At the meantime, you can send your team members the deployment URL in order to login.',
      docLink:
        'https://docs.deepchecks.com/monitoring/stable/installation/self_host.html#define-smtp-for-email-integration'
    }
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
    willBeAssignedTo: 'Will be assigned to ',
    submitButtonLabel: 'Assign',
    searchfieldPlaceholder: 'Search models...',
    dialogListItemSubtitle: (subtitle: number | undefined) =>
      `Last data update: ${subtitle ? dayjs.unix(subtitle).format('ll') : '-'}`
  }
};
