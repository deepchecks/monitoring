import AlertPage from "../pages/AlertPage/AlertPage";
import DashboardPage from "../pages/DashboardPage/DashboardPage";

export const routes = {
  alerts: "/alerts",
  analysis: "/analisis",
  configuration: "/configuration",
  dashboard: "/dashboard",
};

export const publicRoutes = [
  { path: routes.dashboard, Component: DashboardPage },
  { path: routes.alerts, Component: AlertPage },
];

export const privateRoutes = [
  { path: routes.dashboard, Component: DashboardPage },
  { path: routes.alerts, Component: AlertPage },
];
