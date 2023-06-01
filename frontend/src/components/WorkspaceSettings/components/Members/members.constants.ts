import dayjs from 'dayjs';

export const constants = {
  header: {
    title: 'Search member...',
    removeMembers: 'Remove Members',
    inviteMembers: 'Invite members'
  },
  table: {
    ariaLabel: 'organization members table',
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
    title: 'Edit Member',
    submit: 'Save Changes',
    nameInputLabel: 'Name',
    emailInputLabel: 'Email address',
    role: 'Role'
  },
  inviteMember: {
    title: 'Invite Members',
    placeholder: 'email1@org-name.com, email2@org-name.com, email3@org-name.com, email4@org...',
    submit: 'Send Invite',
    inputLabel: 'Email address of the invitees',
    success: 'Users invited successfully!',
    mailConfigErr: 'Email is not configured. Learn how to configure it on our docs.' // TODO - Update to a link once we have it on docs
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
  },
  assignModels: {
    title: 'Assign Models',
    submitButtonLabel: 'Assign',
    searchfieldPlaceholder: 'Search models...',
    dialogListItemSubtitle: (subtitle: number | undefined) =>
      `Last data update: ${subtitle ? dayjs(subtitle).format('ll') : '-'}`
  }
};
