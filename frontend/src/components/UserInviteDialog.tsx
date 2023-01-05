import React, { PropsWithChildren, useState } from 'react';
import dayjs from 'dayjs';
import mixpanel from 'mixpanel-browser';

import {
  createInviteApiV1OrganizationInvitePut,
  InvitationCreationSchema,
  useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete,
  useRetrieveOrganizationMembersApiV1OrganizationMembersGet
} from 'api/generated';

import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Dialog,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useTheme
} from '@mui/material';

import { Loader } from './Loader';

import { CloseIcon, EmailIcon, PlusIcon } from 'assets/icon/icon';

export interface UserInviteDialogProps {
  open: boolean;
  onClose: () => void;
}

export const UserInviteDialog = ({ open, onClose }: PropsWithChildren<UserInviteDialogProps>) => {
  const theme = useTheme();

  const [emailValue, setEmailValue] = useState('');
  const [btnEnabled, setBtnEnabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    data: organizationMembers = [],
    isLoading: isOrganizationMembersLoading,
    refetch
  } = useRetrieveOrganizationMembersApiV1OrganizationMembersGet();

  const { mutate: deleteMember, isLoading: isDeleteMemberLoading } =
    useRemoveOrganizationMemberApiV1OrganizationMembersMemberIdDelete({
      mutation: {
        onSuccess: () => refetch()
      }
    });

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

  const handleDeleteMember = (memberId: number, email: string) => {
    deleteMember({ memberId });

    mixpanel.track('Remove User', {
      'Removed user email': email
    });
  };

  const handleInviteToOrgClick = () => {
    if (btnEnabled) {
      const inviteSchema: InvitationCreationSchema = {
        email: emailValue
      };

      createInviteApiV1OrganizationInvitePut(inviteSchema)
        .then(() => {
          mixpanel.track('Invite User', {
            'Invited user email': emailValue
          });

          setSuccess(true);
          handleClose();
        })
        .catch(reason => {
          console.log(reason);
          setErrorMsg(`User ${emailValue} already exists or invited to the system`);
        });
    }
  };

  const isLoading = isOrganizationMembersLoading || isDeleteMemberLoading;

  return (
    <Dialog
      maxWidth="md"
      fullWidth={true}
      onClose={handleClose}
      open={open}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 0
        }
      }}
    >
      <Box sx={{ padding: '10px 10px 0 30px' }}>
        <Stack direction="row" width={1} justifyContent="space-between">
          <Typography variant="h4" sx={{ paddingTop: '15px' }}>
            Invite to workspace
          </Typography>
          <IconButton
            sx={{
              height: 36,
              width: 36,
              backgroundColor: 'transparent'
            }}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>
      <Box sx={{ padding: '0 30px', marginTop: '42px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <TextField
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme => theme.palette.grey[200]
              }
            }}
            placeholder="Please enter the email address of the invitee.."
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
          <Button
            sx={{ ml: '10px', padding: '0 23px' }}
            onClick={handleInviteToOrgClick}
            disabled={!btnEnabled}
            startIcon={<PlusIcon fill={theme.palette.grey[300]} />}
          >
            invite
          </Button>
        </Box>
        {errorMsg ? <Alert severity="error">{errorMsg}</Alert> : ''}
        {isLoading ? (
          <Loader />
        ) : (
          <List sx={{ p: 0, m: '16px 0 42px', maxHeight: 320, overflow: 'auto' }}>
            {organizationMembers.map(({ id, created_at, email, full_name, picture_url }) => (
              <ListItem
                key={email}
                sx={{
                  padding: '20px 0',
                  borderBottom: theme => `1px solid ${alpha(theme.palette.grey[300], 0.5)}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  ':last-of-type': {
                    borderBottom: 'none'
                  }
                }}
              >
                <Avatar alt={full_name} src={picture_url} />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flexGrow: 1,
                    ml: '10px'
                  }}
                >
                  <Typography variant="subtitle1">{full_name}</Typography>
                  <Stack direction="row">
                    <Typography variant="caption">{email}</Typography>
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{ margin: '0 5px', alignSelf: 'center', height: '8px' }}
                    />
                    <Typography variant="caption">Active since {dayjs(created_at).format('MMMM DD. YYYY')}</Typography>
                  </Stack>
                </Box>
                <Button variant="text" sx={{ padding: '0 16px' }} onClick={() => handleDeleteMember(id, email)}>
                  Remove
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      {/* <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme => alpha(theme.palette.grey[200], 0.5),
          height: 90
        }}
      >
        <Stack direction="row" alignItems="center">
          <Typography variant="body2">
            Or copy the link to your workspace so you can share it any way you like
          </Typography>
          <Typography
            variant="subtitle1"
            ml="8px"
            sx={{ cursor: 'pointer', color: theme => theme.palette.primary.main }}
            onClick={() => navigator.clipboard.writeText('test')}
          >
            Copy link to clipboard
          </Typography>
        </Stack>
      </Box> */}
      <Snackbar open={success} autoHideDuration={6000} message="User invited succesfully" />
    </Dialog>
  );
};
