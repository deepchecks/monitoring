// import { Alarm, Analysis, Caonfiguration, Dashboard } from "../assets/icon/icon"
import Alarm from "./../assets/icon/alarm.svg"
import Analysis from "./../assets/icon/analysis.svg"
import Caonfiguration from "./../assets/icon/caonfiguration.svg"
import Dashboard from "./../assets/icon/dashboard.svg"
import AlarmHover from "./../assets/icon/alarmHover.svg"
import AnalysisHover from "./../assets/icon/analysisHover.svg"
import CaonfigurationHover from "./../assets/icon/caonfigurationHover.svg"
import DashboardHover from "./../assets/icon/dashboardHover.svg"
import AlarmActiv from "./../assets/icon/alarmActiv.svg"
import AnalysisActiv from "./../assets/icon/analysisActiv.svg"
import CaonfigurationActiv from "./../assets/icon/caonfigurationActiv.svg"
import DashboardActiv from "./../assets/icon/dashboardActiv.svg"

export interface SidebarInfo {
        key: string,
        text: string,
        Icon: string,
        IconHover: string,
        ActivIcon: string,
        action: Function,
        activ: boolean
}


let ObjectId = () => Math.random().toString()
export const sideBarInfo = [{
        key: ObjectId(),
        text: "My Dashboard",
        Icon: Dashboard,
        IconHover: DashboardHover,
        ActivIcon: DashboardActiv,
        action: (navigate:any, page:string) => {
            navigate(page)
        },
        activ: false
    },
    {
        key: ObjectId(),
        text: "Alerts",
        Icon: Alarm,
        IconHover: AlarmHover,
        ActivIcon: AlarmActiv,
        action: () => {},
        activ: false,

    },
    {
        key: ObjectId(),
        text: "Analysis",
        Icon: Analysis,
        IconHover: AnalysisHover,
        ActivIcon: DashboardActiv,
        action: () => {},
        activ: false
    },
    {
        key: ObjectId(),
        text: "Configuration",
        Icon: Caonfiguration,
        IconHover: CaonfigurationHover,
        ActivIcon: CaonfigurationActiv,
        action: () => {},
        activ: false
    }
]
