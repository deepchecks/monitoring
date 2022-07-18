import { Routes, Route } from "react-router-dom";
import { Dashboard } from "../components/dashboard/Dashboard";
import { DASHBOARD_ROUTE } from "../helpers/route";

export default function MyRouts() {

    return ( < Routes >
        <Route path = { DASHBOARD_ROUTE } element = { <Dashboard /> } /> 
        </Routes>
    )
}