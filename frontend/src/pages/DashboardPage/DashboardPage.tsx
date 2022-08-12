import { Grid } from "@mui/material";
import { ChartData } from "chart.js";
import { useCallback, useEffect, useState } from "react";
import { DashboardHeader } from "../../content/dashboard/DashboardHeader/DashboardHeader";
import { DataIngestion } from "../../content/dashboard/DataIngestion/DataIngestion";
import { GraphicsSection } from "../../content/dashboard/GraphicsSection/GraphicsSection";
import { ModelList } from "../../content/dashboard/ModelList/ModelList";
import { MonitorDrawer } from "../../content/monitor/MonitorDrawer/MonitorDrawer";
import {
  lineDataChangeFunction,
  setGraphColor,
} from "../../helpers/lineDataChangeFunction";
import { useTypedDispatch, useTypedSelector } from "../../store/hooks";
import { getAlertsCount } from "../../store/slices/alert/alertSlice";
import {
  getAllDataIntestion,
  getModels,
  modelSelector,
} from "../../store/slices/model/modelSlice";
import {
  getMonitors,
  monitorSelector,
} from "../../store/slices/monitor/monitorSlice";
import { ID } from "../../types";
import { StyledDashboardContainer } from "./DashboardPage.style";

const mockData: ChartData<"line"> = lineDataChangeFunction();

export default function DashboardPage() {
  const { allDataIngestion, allModels } = useTypedSelector(modelSelector);
  const { charts, dashboards } = useTypedSelector(monitorSelector);
  const dispatch = useTypedDispatch();
  const [openMonitorDrawer, setOpenMonitorDrawer] = useState<boolean>(false);
  const [monitorId, setMonitorId] = useState<ID>("");
  const [dataIngestion, setDataIngestion] = useState<ChartData<"line", any>>({
    datasets: [],
  });

  const hanleOpenMonitorDrawer = useCallback((monitorId: ID = "") => {
    setMonitorId(monitorId);
    setOpenMonitorDrawer(true);
  }, []);

  const hanleCloseMonitorDrawer = () => {
    setOpenMonitorDrawer(false);
  };

  useEffect(() => {
    dispatch(getAlertsCount());
    if (!allDataIngestion.length) {
      dispatch(getAllDataIntestion());
    }

    dispatch(getModels());
    dispatch(getMonitors());
  }, []);

  useEffect(() => {
    setDataIngestion({
      datasets: Object.entries(allDataIngestion).map(([key, item], index) => ({
        label: key,
        data: item.map(({ count, day }) => ({
          x: new Date(day).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          }),
          y: count,
        })),
        ...setGraphColor(index),
      })),
    });
  }, [allDataIngestion]);

  return (
    <>
      <StyledDashboardContainer>
        <DashboardHeader onOpen={hanleOpenMonitorDrawer} />
        <Grid container spacing="30px" mt="10px">
          <Grid item xs={4}>
            <ModelList models={allModels} />
          </Grid>
          <Grid item xs={8}>
            <DataIngestion data={dataIngestion} title=" Data Ingest Status" />
          </Grid>
          {charts.map((props, index) => (
            <Grid item xs={index > 2 ? 12 : 4} key={index}>
              <GraphicsSection
                data={props}
                monitorId={dashboards.monitors[index].id || 1}
                onOpen={hanleOpenMonitorDrawer}
                title={dashboards.monitors[index].name}
              />
            </Grid>
          ))}
          <Grid item xs={4}>
            <GraphicsSection
              data={mockData}
              monitorId={1}
              onOpen={hanleOpenMonitorDrawer}
              title=" Data Ingest Status"
            />
          </Grid>
          <Grid item xs={4}>
            <GraphicsSection
              data={mockData}
              monitorId={1}
              onOpen={hanleOpenMonitorDrawer}
              title=" Data Ingest Status"
            />
          </Grid>
          <Grid item xs={4}>
            <GraphicsSection
              data={mockData}
              monitorId={1}
              onOpen={hanleOpenMonitorDrawer}
              title=" Data Ingest Status"
            />
          </Grid>
          <Grid item xs={12}>
            <GraphicsSection
              data={mockData}
              monitorId={1}
              onOpen={hanleOpenMonitorDrawer}
              title=" Data Ingest Status"
            />
          </Grid>
          <Grid item xs={12}>
            <GraphicsSection
              data={mockData}
              monitorId={1}
              onOpen={hanleOpenMonitorDrawer}
              title=" Data Ingest Status"
            />
          </Grid>
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
