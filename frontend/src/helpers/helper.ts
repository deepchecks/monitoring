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
import { routes } from "./routes";

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
    link: routes.dashboard,
    Icon: Dashboard,
    IconHover: DashboardHover,
    ActivIcon: DashboardActive,
  },
  {
    text: "Alerts",
    link: routes.alerts,
    Icon: Alarm,
    IconHover: AlarmHover,
    ActivIcon: AlarmActive,
  },
  {
    text: "Analysis",
    link: routes.analysis,
    Icon: Analysis,
    IconHover: AnalysisHover,
    ActivIcon: AnalysisActive,
  },
  {
    text: "Configuration",
    link: routes.configuration,
    Icon: Configuration,
    IconHover: ConfigurationHover,
    ActivIcon: ConfigurationActive,
  },
];
