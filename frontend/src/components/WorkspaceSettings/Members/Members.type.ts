import { MemberSchema } from 'api/generated';

export interface MembersActionDialog {
  open: boolean;
  closeDialog: () => void;
}

export interface MembersActionDialogWithInputs extends MembersActionDialog {
  member: MemberSchema;
  refetchMembers: () => void;
}

export enum MembersActionDialogOptions {
  invite = 'invite',
  edit = 'edit',
  remove = 'remove'
}
