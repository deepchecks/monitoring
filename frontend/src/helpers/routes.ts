import DashboardPage from "../pages/DashboardPage/DashboardPage";

export const routes = {
  alerts: "/alerts",
  analysis: "/analisis",
  configuration: "/configuration",
  dashboard: "/dashboard",
};

export const publicRoutes = [
  { path: routes.dashboard, Component: DashboardPage },
];

export const privateRoutes = [
  { path: routes.dashboard, Component: DashboardPage },
];
