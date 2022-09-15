import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogTitle,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Snackbar,
  TextField
} from '@mui/material';
import { createInviteApiV1OrganizationInvitePut, InvitationCreationSchema, UserSchema } from 'api/generated';
import { EmailIcon } from 'assets/icon/icon';
import React, { PropsWithChildren, useState } from 'react';

export interface UserInviteDialogProps {
  open: boolean;
  onClose: () => void;
}

export const UserInviteDialog = ({ open, onClose }: PropsWithChildren<UserInviteDialogProps>) => {
  const [emailValue, setEmailValue] = useState('');
  const [btnEnabled, setBtnEnabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const handleClose = () => {
    onClose();
  };

  const validateEmail = (email: string) => {
    const valid = /\S+@\S+\.\S+/.test(email);

    if (valid) {
      setEmailValue(email);
    } else {
      setEmailValue('');
    }
    setBtnEnabled(valid);
  };

  const handleInviteToOrgClick = () => {
    if (btnEnabled) {
      const inviteSchema: InvitationCreationSchema = {
        email: emailValue,
        ttl: 1 * 24 * 60 * 60
      };
      createInviteApiV1OrganizationInvitePut(inviteSchema)
        .then(res => {
          setSuccess(true);
          handleClose();
        })
        .catch(reason => {
          console.log(reason);
          setErrorMsg(`User ${emailValue} already exists or invited to the system`);
        });
    }
  };

  const handleListItemClick = (value: string) => {
    onClose();
  };
  // TODO: Fetch the org members from backend
  const organizationMembers: UserSchema[] = [];

  return (
    <Dialog maxWidth="md" fullWidth={true} onClose={handleClose} open={open}>
      <DialogTitle>Invite to workspace</DialogTitle>
      <Box sx={{ display: 'flex', justifyContent: 'center', m: 2, p: 2 }}>
        <TextField
          sx={{ flexGrow: 1, m: 1 }}
          label="Please enter the email address of the invitee.."
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon></EmailIcon>
              </InputAdornment>
            )
          }}
          onChange={text => validateEmail(text.target.value)}
        ></TextField>
        <Button sx={{ m: 1 }} onClick={handleInviteToOrgClick} disabled={!btnEnabled}>
          <Avatar sx={{ background: 'none' }}>+</Avatar>
          invite
        </Button>
      </Box>
      {errorMsg ? <Alert severity="error">{errorMsg}</Alert> : ''}
      <List sx={{ pt: 0 }}>
        {organizationMembers.map(member => (
          <ListItem
            button
            onClick={() => handleListItemClick(member.full_name ? member.full_name : member.email)}
            key={member.email}
          >
            <ListItemAvatar>
              {/* <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>
                  <PersonIcon />
                </Avatar> */}
            </ListItemAvatar>
            <ListItemText primary={member.email} />
          </ListItem>
        ))}
      </List>

      <Snackbar open={success} autoHideDuration={6000} message="User invited succesfully" />
    </Dialog>
  );
};
