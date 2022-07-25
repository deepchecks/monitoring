import DashboardPage from "../pages/DashboardPage/DashboardPage";

export const DASHBOARD_ROUTE = "/dashboard";
export const ALERTS = "/alerts";
export const ANALISIS = "/analisis";
export const CONFIGURATION = "/configuration";

export const publicRoutes = [
  { path: DASHBOARD_ROUTE, Component: DashboardPage },
];

export const privateRoutes = [
  { path: DASHBOARD_ROUTE, Component: DashboardPage },
];
