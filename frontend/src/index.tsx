import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import App from './App';
import { hotjar } from 'react-hotjar';
import mixpanel from 'mixpanel-browser';

import { theme } from './theme';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const hotjarId = process.env.REACT_APP_HJ_ID;
const hotjarSv = process.env.REACT_APP_HJ_SV;
const mixpanelId = process.env.REACT_APP_MIXPANEL_ID;

if (hotjarId && hotjarSv) {
  hotjar.initialize(+hotjarId, +hotjarSv);
}

if (mixpanelId) {
  mixpanel.init(mixpanelId);
}

root.render(
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </BrowserRouter>
);
