import { MemberSchema } from 'api/generated';

export interface MembersActionDialog {
  open: boolean;
  closeDialog: () => void;
}

export interface MembersActionDialogWithRefetch extends MembersActionDialog {
  refetchMembers: () => void;
}

export interface MembersActionDialogWithMember extends MembersActionDialogWithRefetch {
  member: MemberSchema;
}

export enum MembersActionDialogOptions {
  invite = 'invite',
  edit = 'edit',
  remove = 'remove',
  removeSelected = 'removeSelected',
  assignModels = 'assignModels',
  deleteWorkspace = 'deleteWorkspace'
}
