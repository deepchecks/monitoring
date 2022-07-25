// import { Alarm, Analysis, Caonfiguration, Dashboard } from "../assets/icon/icon"
import { NavigateFunction } from "react-router-dom";
import Alarm from "../assets/icon/alarm.svg";
import AlarmActiv from "../assets/icon/alarmActiv.svg";
import AlarmHover from "../assets/icon/alarmHover.svg";
import Analysis from "../assets/icon/analysis.svg";
import AnalysisHover from "../assets/icon/analysisHover.svg";
import Caonfiguration from "../assets/icon/caonfiguration.svg";
import CaonfigurationActiv from "../assets/icon/caonfigurationActiv.svg";
import CaonfigurationHover from "../assets/icon/caonfigurationHover.svg";
import Dashboard from "../assets/icon/dashboard.svg";
import DashboardActiv from "../assets/icon/dashboardActiv.svg";
import DashboardHover from "../assets/icon/dashboardHover.svg";
import { ALERTS, ANALISIS, CONFIGURATION, DASHBOARD_ROUTE } from "./routes";

export interface SidebarInfo {
  key: string;
  text: string;
  link: string;
  Icon: string;
  IconHover: string;
  ActivIcon: string;
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
    ActivIcon: DashboardActiv,
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
    ActivIcon: AlarmActiv,
    action: () => 1,
    activ: false,
  },
  {
    key: ObjectId(),
    text: "Analysis",
    link: ANALISIS,
    Icon: Analysis,
    IconHover: AnalysisHover,
    ActivIcon: DashboardActiv,
    action: () => 1,
    activ: false,
  },
  {
    key: ObjectId(),
    text: "Configuration",
    link: CONFIGURATION,
    Icon: Caonfiguration,
    IconHover: CaonfigurationHover,
    ActivIcon: CaonfigurationActiv,
    action: () => 1,
    activ: false,
  },
];
