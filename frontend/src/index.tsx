import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { hotjar } from 'react-hotjar';
import mixpanel from 'mixpanel-browser';

import { ThemeProvider } from '@mui/material';
import { theme } from './theme';

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const hotjarId = process.env.REACT_APP_HJ_ID;
const hotjarSv = process.env.REACT_APP_HJ_SV;
const mixpanelId = process.env.REACT_APP_MIXPANEL_ID;

if (hotjarId && hotjarSv) {
  hotjar.initialize(+hotjarId, +hotjarSv);
}

if (mixpanelId) {
  mixpanel.init(mixpanelId, { ignore_dnt: true });
}

root.render(
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </BrowserRouter>
);
