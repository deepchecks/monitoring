import React, { FC, lazy } from 'react';

import { AnalysisProvider } from 'context/analysis-context';

const AlertRules = lazy(() => import('pages/AlertRules'));
const AlertsPage = lazy(() => import('pages/AlertsPage'));
const DashboardPage = lazy(() => import('pages/DashboardPage'));
const IntegrationsPage = lazy(() => import('pages/IntegrationsPage'));
const AnalysisPage = lazy(() => import('pages/AnalysisPage'));
const NotificationsPage = lazy(() => import('pages/NotificationsPage'));
const ModelsPage = lazy(() => import('pages/ModelsPage'));
const APIKeyPage = lazy(() => import('pages/APIKeyPage'));

import {
  Alarm,
  AlarmActive,
  AlarmHover,
  Analysis,
  AnalysisActive,
  AnalysisHover,
  Configuration,
  ConfigurationActive,
  ConfigurationHover,
  Dashboard,
  DashboardActive,
  DashboardHover
} from '../assets/icon/icon';

export interface PathInfo {
  title: string;
  link: string;
  element: () => JSX.Element;
  Icon: FC | null;
  IconHover: FC | null;
  ActiveIcon: FC | null;
  children?: PathInfo[];
}

export const pathsInfo: PathInfo[] = [
  {
    title: 'Dashboard',
    link: '/dashboard',
    element: () => <DashboardPage />,
    Icon: Dashboard,
    IconHover: DashboardHover,
    ActiveIcon: DashboardActive
  },
  {
    title: 'Alerts',
    link: '/alerts',
    element: () => <AlertsPage />,
    Icon: Alarm,
    IconHover: AlarmHover,
    ActiveIcon: AlarmActive,
    children: [
      {
        title: 'Resolved Alerts',
        link: '/resolved-alerts',
        Icon: null,
        element: () => <AlertsPage resolved />,
        IconHover: null,
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
    Icon: Analysis,
    IconHover: AnalysisHover,
    ActiveIcon: AnalysisActive
  },
  {
    title: 'Configuration',
    link: '/configuration',
    element: () => <DashboardPage />,
    Icon: Configuration,
    IconHover: ConfigurationHover,
    ActiveIcon: ConfigurationActive,
    children: [
      {
        title: 'Alerts Rules',
        link: '/configuration/alert-rules',
        Icon: null,
        element: () => <AlertRules />,
        IconHover: null,
        ActiveIcon: null
      },
      {
        title: 'Models',
        link: '/configuration/models',
        Icon: null,
        element: () => <ModelsPage />,
        IconHover: null,
        ActiveIcon: null
      },
      {
        title: 'Notification',
        link: '/configuration/notifications',
        Icon: null,
        element: () => <NotificationsPage />,
        IconHover: null,
        ActiveIcon: null
      },
      {
        title: 'Integrations',
        link: '/configuration/integrations',
        Icon: null,
        element: () => <IntegrationsPage />,
        IconHover: null,
        ActiveIcon: null
      },
      {
        title: 'API Key',
        link: '/configuration/api-key',
        Icon: null,
        element: () => <APIKeyPage />,
        IconHover: null,
        ActiveIcon: null
      }
    ]
  }
];
