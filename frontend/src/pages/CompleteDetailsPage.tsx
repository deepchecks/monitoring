import React, { useEffect, useState } from 'react';

import {
  getAvailableFeaturesApiV1OrganizationAvailableFeaturesGet,
  useGetCompleteDetailsApiV1UsersCompleteDetailsGet
} from '../api/generated';

import { Alert, Stack, Typography, Grid, Box, Paper, Link, TextField, Button } from '@mui/material';

import { Loader } from 'components/base/Loader/Loader';
import { StyledLogo } from 'components/lib';

import { LoginScreenImage } from 'assets/bg/backgrounds';
import { postCompleteDetails, postCompleteDetailsAndAcceptInvite } from '../helpers/services/userService';

export const CompleteDetailsPage = () => {
  const { data: completeDetailsData, isLoading } = useGetCompleteDetailsApiV1UsersCompleteDetailsGet();

  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [acceptInvite, setAcceptInvite] = useState(false);
  const [flags, setFlags] = useState({ signup_enabled: true });

  const getFlags = async () => {
    const res = await getAvailableFeaturesApiV1OrganizationAvailableFeaturesGet();
    setFlags(res as any);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (acceptInvite && fullName) {
      await postCompleteDetailsAndAcceptInvite({ fullName, acceptInvite });
    }

    if (fullName && organization) {
      await postCompleteDetails({ fullName, organization });
    }
  };

  useEffect(() => {
    if (completeDetailsData?.user_full_name && completeDetailsData?.organization_name) {
      window.location.href = window.location.origin;
      return;
    }

    setFullName(completeDetailsData?.user_full_name ? completeDetailsData.user_full_name : '');
    setOrganization(completeDetailsData?.organization_name ? completeDetailsData.organization_name : '');
    setAcceptInvite(completeDetailsData?.invitation ? true : false);
  }, [completeDetailsData]);

  useEffect(() => {
    getFlags();
  }, []);

  if (isLoading) return <Loader />;

  return (
    <Stack sx={{ height: '100vh', flexDirection: 'row' }}>
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '35vw'
          }}
        >
          <StyledLogo withLabel />
          {!acceptInvite && !flags.signup_enabled ? (
            <>
              <Typography sx={{ fontWeight: 700, mt: 8 }}>
                At this point, Deepchecks Hub will only be available by invitation.
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                Please contact us at info@deepchecks.com to get an invite.
              </Typography>
            </>
          ) : (
            <>
              <Typography sx={{ fontWeight: 300, mt: 8 }}>Sign Up</Typography>
              {acceptInvite ? (
                <Alert
                  severity="info"
                  sx={{
                    lineHeight: 2.5,
                    margin: '10px 0'
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 'bold',
                      display: 'inline-block'
                    }}
                  >
                    {completeDetailsData?.invitation?.from_user}
                  </Typography>{' '}
                  invited you to{' '}
                  <Typography
                    sx={{
                      fontWeight: 'bold',
                      display: 'inline-block'
                    }}
                  >
                    {completeDetailsData?.invitation?.org_name}
                  </Typography>{' '}
                  go ahead to get in.
                  <br />
                  {flags.signup_enabled ? (
                    <>
                      Want to create a new organization instead?{' '}
                      <Link
                        href="#"
                        variant="body2"
                        sx={{
                          margin: '0 auto'
                        }}
                        onClick={() => {
                          setAcceptInvite(false);
                        }}
                      >
                        Click here
                      </Link>
                    </>
                  ) : (
                    ''
                  )}
                </Alert>
              ) : (
                ''
              )}
              <Box
                component="form"
                noValidate
                onSubmit={handleSubmit}
                sx={{
                  mt: 1,
                  maxWidth: '306px'
                }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="full_name"
                  label="Full Name"
                  name="full_name"
                  autoFocus
                  onChange={ev => setFullName(ev.target.value)}
                  value={fullName}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="organization"
                  label="Organization"
                  type="text"
                  id="organization"
                  disabled={acceptInvite}
                  value={acceptInvite ? completeDetailsData?.invitation?.org_name : organization}
                  onChange={ev => setOrganization(ev.target.value)}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2, height: '56px', width: '306px' }}
                >
                  Submit
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Grid>
      <Stack
        sx={theme => ({
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.primary.main,
          width: '65vw',
          height: '100vh'
        })}
      >
        <LoginScreenImage />
      </Stack>
    </Stack>
  );
};

export default CompleteDetailsPage;
