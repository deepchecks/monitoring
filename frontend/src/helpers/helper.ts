// import { Alarm, Analysis, Caonfiguration, Dashboard } from "../assets/icon/icon"
import { FC } from "react";
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
  DashboardHover,
} from "../assets/icon/icon";
import { ALERTS, ANALISIS, CONFIGURATION, DASHBOARD_ROUTE } from "./routes";

export interface SidebarInfo {
  text: string;
  link: string;
  Icon: FC;
  IconHover: FC;
  ActivIcon: FC;
}

export const sideBarInfo: SidebarInfo[] = [
  {
    text: "My Dashboard",
    link: DASHBOARD_ROUTE,
    Icon: Dashboard,
    IconHover: DashboardHover,
    ActivIcon: DashboardActive,
  },
  {
    text: "Alerts",
    link: ALERTS,
    Icon: Alarm,
    IconHover: AlarmHover,
    ActivIcon: AlarmActive,
  },
  {
    text: "Analysis",
    link: ANALISIS,
    Icon: Analysis,
    IconHover: AnalysisHover,
    ActivIcon: AnalysisActive,
  },
  {
    text: "Configuration",
    link: CONFIGURATION,
    Icon: Configuration,
    IconHover: ConfigurationHover,
    ActivIcon: ConfigurationActive,
  },
];
