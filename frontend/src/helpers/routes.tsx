import React, { ComponentType, FC, lazy } from 'react';
import { Notifications, BarChart, Dashboard, Settings } from '@mui/icons-material';

import { AnalysisProvider } from 'helpers/context/AnalysisProvider';

export interface PathInfo {
  title: string;
  link: string;
  element: () => JSX.Element;
  Icon: FC | null;
  ActiveIcon: FC | null;
  children?: PathInfo[];
  ignoreLink?: boolean;
}

export const lazyRetry = function (componentImport: () => Promise<any>) {
  return new Promise<{ default: ComponentType<any> }>((resolve, reject) => {
    const hasRefreshed = JSON.parse(window.sessionStorage.getItem('retry-lazy-refreshed') || 'false');

    componentImport()
      .then(component => {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'false'); // success so reset the refresh
        resolve(component);
      })
      .catch(error => {
        if (!hasRefreshed) {
          window.sessionStorage.setItem('retry-lazy-refreshed', 'true'); // we are now going to refresh
          return window.location.reload(); // refresh the page
        }

        reject(error);
      });
  });
};

const AlertRules = lazy(() => lazyRetry(() => import('pages/AlertRules')));
const AlertsPage = lazy(() => lazyRetry(() => import('pages/AlertsPage')));
const DashboardPage = lazy(() => lazyRetry(() => import('pages/DashboardPage')));
const IntegrationsPage = lazy(() => lazyRetry(() => import('pages/IntegrationsPage')));
const AnalysisPage = lazy(() => lazyRetry(() => import('pages/AnalysisPage')));
const NotificationsPage = lazy(() => lazyRetry(() => import('pages/NotificationsPage')));
const ModelsPage = lazy(() => lazyRetry(() => import('pages/ModelsPage')));
const APIKeyPage = lazy(() => lazyRetry(() => import('pages/APIKeyPage')));
const SuiteViewPage = lazy(() => lazyRetry(() => import('pages/SuiteViewPage')));
const WorkspaceSettingsPage = lazy(() => lazyRetry(() => import('pages/WorkspaceSettingsPage')));
const OnBoardingPage = lazy(() => lazyRetry(() => import('pages/OnBoardingPage')));
const CompleteDetails = lazy(() => lazyRetry(() => import('pages/CompleteDetails')));
const LicenseAgreementPage = lazy(() => lazyRetry(() => import('pages/LicenseAgreement')));
const NotFoundPage = lazy(() => lazyRetry(() => import('pages/NotFoundPage')));

const DashboardIcon = () => <Dashboard sx={{ color: 'grey' }} />;
const DashboardActiveIcon = () => <Dashboard sx={{ color: '#7964FF' }} />;
const AlertsIcon = () => <Notifications sx={{ color: 'grey' }} />;
const AlertsActiveIcon = () => <Notifications sx={{ color: '#7964FF' }} />;
const AnalysisIcon = () => <BarChart sx={{ color: 'grey' }} />;
const AnalysisActiveIcon = () => <BarChart sx={{ color: '#7964FF' }} />;
const ConfigurationsIcon = () => <Settings sx={{ color: 'grey' }} />;
const ConfigurationsActiveIcon = () => <Settings sx={{ color: '#7964FF' }} />;

export const pathsInfo: PathInfo[] = [
  {
    title: 'Dashboard',
    link: '/',
    element: () => <DashboardPage />,
    Icon: null,
    ActiveIcon: null,
    ignoreLink: true
  },
  {
    title: 'Dashboard',
    link: '/dashboard',
    element: () => <DashboardPage />,
    Icon: DashboardIcon,
    ActiveIcon: DashboardActiveIcon
  },
  {
    title: 'Suite View',
    link: '/suite-view',
    element: () => <SuiteViewPage />,
    Icon: null,
    ActiveIcon: null,
    ignoreLink: true
  },
  {
    title: 'Alerts',
    link: '/alerts',
    element: () => <AlertsPage />,
    Icon: AlertsIcon,
    ActiveIcon: AlertsActiveIcon,
    children: [
      {
        title: 'Resolved Alerts',
        link: '/resolved-alerts',
        Icon: null,
        element: () => <AlertsPage resolved />,
        ActiveIcon: null
      }
    ]
  },
  {
    title: 'Analysis',
    link: '/analysis',
    element: () => (
      <AnalysisProvider>
        <AnalysisPage />
      </AnalysisProvider>
    ),
    Icon: AnalysisIcon,
    ActiveIcon: AnalysisActiveIcon
  },
  {
    title: 'Configuration',
    link: '/configuration',
    element: () => <DashboardPage />,
    Icon: ConfigurationsIcon,
    ActiveIcon: ConfigurationsActiveIcon,
    children: [
      {
        title: 'Alerts Rules',
        link: '/configuration/alert-rules',
        Icon: null,
        element: () => <AlertRules />,
        ActiveIcon: null
      },
      {
        title: 'Models',
        link: '/configuration/models',
        Icon: null,
        element: () => <ModelsPage />,
        ActiveIcon: null
      },
      {
        title: 'Notification',
        link: '/configuration/notifications',
        Icon: null,
        element: () => <NotificationsPage />,
        ActiveIcon: null
      },
      {
        title: 'Integrations',
        link: '/configuration/integrations',
        Icon: null,
        element: () => <IntegrationsPage />,
        ActiveIcon: null
      },
      {
        title: 'API Key',
        link: '/configuration/api-key',
        Icon: null,
        element: () => <APIKeyPage />,
        ActiveIcon: null
      }
    ]
  },
  {
    title: 'Workspace Settings',
    link: '/workspace-settings',
    element: () => <WorkspaceSettingsPage />,
    Icon: null,
    ActiveIcon: null,
    ignoreLink: true
  }
];

export const outLayoutRoutes: PathInfo[] = [
  {
    title: 'OnBoarding',
    link: '/onboarding',
    element: () => <OnBoardingPage />,
    Icon: null,
    ActiveIcon: null,
    ignoreLink: true
  },
  {
    title: 'Complete Details',
    link: '/complete-details',
    element: () => <CompleteDetails />,
    Icon: null,
    ActiveIcon: null,
    ignoreLink: true
  },
  {
    title: 'License Agreement',
    link: '/license-agreement',
    element: () => <LicenseAgreementPage />,
    Icon: null,
    ActiveIcon: null,
    ignoreLink: true
  },
  {
    title: '404',
    link: '/*',
    element: () => <NotFoundPage />,
    Icon: null,
    ActiveIcon: null,
    ignoreLink: true
  }
];
