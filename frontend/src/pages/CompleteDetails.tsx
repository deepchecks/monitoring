import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import { Logo } from '../components/Logo';
import { theme } from '../theme';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';

import { useGetCompleteDetailsApiV1UsersCompleteDetailsGet } from '../api/generated';
import { useFlags } from 'launchdarkly-react-client-sdk';

// Services:
import { postCompleteDetails, postCompleteDetailsAndAcceptInvite } from '../helpers/services/userService';
import { Loader } from 'components/Loader';
import { Alert } from '@mui/material';

export const CompleteDetails = () => {
  const { data: completeDetailsData, isLoading } = useGetCompleteDetailsApiV1UsersCompleteDetailsGet();

  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [acceptInvite, setAcceptInvite] = useState(false);

  const flags = useFlags();

  useEffect(() => {
    if (completeDetailsData?.user_full_name && completeDetailsData?.organization_name) {
      window.location.href = window.location.origin;
      return;
    }

    setFullName(completeDetailsData?.user_full_name ? completeDetailsData.user_full_name : '');
    setOrganization(completeDetailsData?.organization_name ? completeDetailsData.organization_name : '');
    setAcceptInvite(completeDetailsData?.invitation ? true : false);
  }, [completeDetailsData]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (acceptInvite && fullName) {
      await postCompleteDetailsAndAcceptInvite({ fullName, acceptInvite });
    }

    if (fullName && organization) {
      await postCompleteDetails({ fullName, organization });
    }
  };

  if (isLoading) return <Loader />;

  let detailsGrid = null;

  if (!acceptInvite && !flags.signUpEnabled) {
    detailsGrid = (
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Logo isColored={true} />
          <Typography sx={{ fontWeight: 700, my: 8 }}>
            At this point, Deepchecks Hub will only be available by invitation. Please contact us at info@deepchecks.com
            to get an invite.
          </Typography>
        </Box>
      </Grid>
    );
  } else {
    detailsGrid = (
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Logo isColored={true} />
          <Typography sx={{ fontWeight: 300 }}>Some extra details so we can help you better.</Typography>
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
              {flags.signUpEnabled ? (
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
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2, height: '56px', width: '306px' }}>
              Submit
            </Button>
          </Box>
        </Box>
      </Grid>
    );
  }
  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        <CssBaseline />
        {detailsGrid}
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage: 'url(https://source.unsplash.com/random)',
            backgroundRepeat: 'no-repeat',
            backgroundColor: t => (t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900]),
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      </Grid>
    </ThemeProvider>
  );
};

export default CompleteDetails;
