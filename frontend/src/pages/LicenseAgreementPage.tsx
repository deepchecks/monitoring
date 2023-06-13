import React, { useEffect } from 'react';

import {
  Button,
  Checkbox,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Grid,
  ThemeProvider
} from '@mui/material';

import { eulaAcceptanceApiV1UsersAcceptEulaGet } from 'api/generated';

import { termsAndConditions } from 'helpers/base/termsAndConditions';

import { theme } from '../components/lib/theme';

export const LicenseAgreementPage = function () {
  const descriptionElementRef = React.useRef<HTMLElement>(null);
  const [agree, setAgreement] = React.useState(false);

  useEffect(() => {
    const { current: descriptionElement } = descriptionElementRef;
    if (descriptionElement !== null) {
      descriptionElement.focus();
    }
  });

  const handleSubscribe = () => {
    eulaAcceptanceApiV1UsersAcceptEulaGet().then(() => {
      window.location.href = '/';
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        <CssBaseline />
      </Grid>
      <Dialog open={true} scroll="paper" fullWidth={true} maxWidth="xl">
        <DialogTitle sx={{ ml: '45px' }}>Please review and approve our service terms and conditions</DialogTitle>
        <DialogContent sx={{ marginBottom: '16px' }}>
          <DialogContentText
            id="scroll-dialog-description"
            ref={descriptionElementRef}
            sx={{ padding: '0 16px', width: 'calc(100% - 48px)' }}
          >
            <div dangerouslySetInnerHTML={{ __html: termsAndConditions }} />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <FormControlLabel
            control={<Checkbox value={agree} onChange={() => setAgreement(!agree)}></Checkbox>}
            label="I agree to the end user license agreement"
            sx={{ flex: 1, ml: 0 }}
          />
          <Button
            disabled={!agree}
            onClick={handleSubscribe}
            sx={{ width: '100px', marginRight: '16px' }}
            variant="contained"
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

export default LicenseAgreementPage;
