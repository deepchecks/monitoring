import { Grid } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { DashboardHeader } from "../../content/dashboard/DashboardHeader/DashboardHeader";
import { DataIngestion } from "../../content/dashboard/DataIngestion/DataIngestion";
import { GraphicsSection } from "../../content/dashboard/GraphicsSection/GraphicsSection";
import { ModelList } from "../../content/dashboard/ModelList/ModelList";
import { MonitorDrawer } from "../../content/monitor/MonitorDrawer/MonitorDrawer";
import { useTypedDispatch, useTypedSelector } from "../../store/hooks";
import { getAlertsCount } from "../../store/slices/alert/alertSlice";
import { clearCheckState } from "../../store/slices/check/checkSlice";
import {
  clearColumns,
  getModels,
  modelSelector,
} from "../../store/slices/model/modelSlice";
import {
  getMonitors,
  monitorChartsSelector,
  monitorSelector,
} from "../../store/slices/monitor/monitorSlice";
import { ID } from "../../types";
import { StyledDashboardContainer } from "./DashboardPage.style";

export default function DashboardPage() {
  const { allModels } = useTypedSelector(modelSelector);
  const { dashboards } = useTypedSelector(monitorSelector);
  const charts = useTypedSelector(monitorChartsSelector);
  const dispatch = useTypedDispatch();
  const [openMonitorDrawer, setOpenMonitorDrawer] = useState<boolean>(false);
  const [monitorId, setMonitorId] = useState<ID>("");

  const hanleOpenMonitorDrawer = useCallback((monitorId: ID = "") => {
    setMonitorId(monitorId);
    setOpenMonitorDrawer(true);
  }, []);

  const hanleCloseMonitorDrawer = useCallback(() => {
    dispatch(clearCheckState());
    dispatch(clearColumns());
    setOpenMonitorDrawer(false);
  }, []);

  useEffect(() => {
    dispatch(getAlertsCount());
    dispatch(getModels());
    dispatch(getMonitors());
  }, []);

  return (
    <>
      <StyledDashboardContainer>
        <DashboardHeader onOpen={hanleOpenMonitorDrawer} />
        <Grid container spacing="30px" mt="10px">
          <Grid item xs={4}>
            <ModelList models={allModels} />
          </Grid>
          <Grid item xs={8}>
            <DataIngestion />
          </Grid>
          {charts.map((props, index) => (
            <Grid item xs={index > 2 ? 12 : 4} key={index}>
              <GraphicsSection
                data={props}
                monitorId={dashboards.monitors[index]?.id || 1}
                onOpen={hanleOpenMonitorDrawer}
                title={dashboards.monitors[index]?.name}
              />
            </Grid>
          ))}
        </Grid>
      </StyledDashboardContainer>
      <MonitorDrawer
        anchor="right"
        open={openMonitorDrawer}
        onClose={hanleCloseMonitorDrawer}
        monitorId={monitorId}
      />
    </>
  );
}
