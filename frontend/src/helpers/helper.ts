import { AlertRules } from 'pages/AlertRules';
import { AlertsPage } from 'pages/AlertsPage';
import { DashboardPage } from 'pages/DashboardPage';
import { FC } from 'react';
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
    title: 'My Dashboard',
    link: '/dashboard',
    element: DashboardPage,
    Icon: Dashboard,
    IconHover: DashboardHover,
    ActiveIcon: DashboardActive
  },
  {
    title: 'Alerts',
    link: '/alerts',
    element: AlertsPage,
    Icon: Alarm,
    IconHover: AlarmHover,
    ActiveIcon: AlarmActive
  },
  {
    title: 'Analysis',
    link: '/analysis',
    element: DashboardPage,
    Icon: Analysis,
    IconHover: AnalysisHover,
    ActiveIcon: AnalysisActive
  },
  {
    title: 'Configuration',
    link: '/configuration',
    element: DashboardPage,
    Icon: Configuration,
    IconHover: ConfigurationHover,
    ActiveIcon: ConfigurationActive,
    children: [
      {
        title: 'Alerts Rules',
        link: '/configuration/alert-rules',
        Icon: null,
        element: AlertRules,
        IconHover: null,
        ActiveIcon: null
      }
    ]
  }
];
