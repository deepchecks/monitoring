import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';

import { theme } from './theme';

import App from './App';
import InitializationProvider from 'components/Providers/InitializationProvider';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

(async () => {
  const LDProvider = await asyncWithLDProvider({
    clientSideID: process.env.REACT_APP_LD_CLIENT_SIDE_ID ? process.env.REACT_APP_LD_CLIENT_SIDE_ID : '',
    user: {
      key: 'noauthkey',
      name: 'Unauthorized User',
      email: 'unauthorized@unauth.com'
    },
    options: {
      /* ... */
    }
  });

  root.render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <LDProvider>
          <InitializationProvider>
            <App />
          </InitializationProvider>
        </LDProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
})();
