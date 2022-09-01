// import { Alarm, Analysis, Caonfiguration, Dashboard } from "../assets/icon/icon"
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

export interface SidebarInfo {
  text: string;
  link: string;
  Icon: FC;
  IconHover: FC;
  ActivIcon: FC;
}

export const sideBarInfo: SidebarInfo[] = [
  {
    text: 'My Dashboard',
    link: '/dashboard',
    Icon: Dashboard,
    IconHover: DashboardHover,
    ActivIcon: DashboardActive
  },
  {
    text: 'Alerts',
    link: '/alerts',
    Icon: Alarm,
    IconHover: AlarmHover,
    ActivIcon: AlarmActive
  },
  {
    text: 'Analysis',
    link: '/analysis',
    Icon: Analysis,
    IconHover: AnalysisHover,
    ActivIcon: AnalysisActive
  },
  {
    text: 'Configuration',
    link: '/configuration',
    Icon: Configuration,
    IconHover: ConfigurationHover,
    ActivIcon: ConfigurationActive
  }
];
