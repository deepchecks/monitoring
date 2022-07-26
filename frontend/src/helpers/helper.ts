// import { Alarm, Analysis, Caonfiguration, Dashboard } from "../assets/icon/icon"
import { FC } from "react";
import { NavigateFunction } from "react-router-dom";
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
  key: string;
  text: string;
  link: string;
  Icon: FC;
  IconHover: FC;
  ActivIcon: FC;
  action: (navigate: NavigateFunction, page: string) => void;
  activ: boolean;
}

const ObjectId = () => Math.random().toString();

export const sideBarInfo: SidebarInfo[] = [
  {
    key: ObjectId(),
    text: "My Dashboard",
    link: DASHBOARD_ROUTE,
    Icon: Dashboard,
    IconHover: DashboardHover,
    ActivIcon: DashboardActive,
    action: (navigate: NavigateFunction, page: string) => {
      navigate(page);
    },
    activ: false,
  },
  {
    key: ObjectId(),
    text: "Alerts",
    link: ALERTS,
    Icon: Alarm,
    IconHover: AlarmHover,
    ActivIcon: AlarmActive,
    action: () => 1,
    activ: false,
  },
  {
    key: ObjectId(),
    text: "Analysis",
    link: ANALISIS,
    Icon: Analysis,
    IconHover: AnalysisHover,
    ActivIcon: AnalysisActive,
    action: () => 1,
    activ: false,
  },
  {
    key: ObjectId(),
    text: "Configuration",
    link: CONFIGURATION,
    Icon: Configuration,
    IconHover: ConfigurationHover,
    ActivIcon: ConfigurationActive,
    action: () => 1,
    activ: false,
  },
];
