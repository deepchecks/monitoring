import { Box } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { AlertSnackbar } from "../../components/AlertSnackbar/AlertSnackbar";
import { AlertDrawer } from "../../content/alert/AlertDrawer/AlertDrawer";
import { AlertFilters } from "../../content/alert/AlertFilters/AlertFilters";
import { AlertHeader } from "../../content/alert/AlertHeader/AlertHeader";
import { AlertResolveDialog } from "../../content/alert/AlertResolveDialog/AlertResolveDialog";
import { AlertRuleItem } from "../../content/alert/AlertRuleItem/AlertRuleItem";
import { useTypedDispatch, useTypedSelector } from "../../store/hooks";
import {
  alertSelector,
  getAlertsByAlertRuleId,
  getAlertsCount,
  resolveAllAlerts,
  setAlertRule,
} from "../../store/slices/alert/alertSlice";
import { getModels, modelSelector } from "../../store/slices/model/modelSlice";
import {
  clearMonitorGraph,
  getMonitor,
  runMonitor,
} from "../../store/slices/monitor/monitorSlice";
import { ID } from "../../types";
import { AlertRule } from "../../types/alert";
import {
  StyledAlertContainer,
  StyledList,
  StyledListItem,
} from "./AlertPage.style";

const snackbarPosition = {
  vertical: "bottom",
  horizontal: "right",
} as const;

export default function AlertPage() {
  const [open, setOpen] = useState(false);
  const [openAlertDrawer, setOpenAlertDrawer] = useState<boolean>(false);
  const [notification, setNotification] = useState<boolean>(false);
  const { alertRules, count, error } = useTypedSelector(alertSelector);
  const { modelsMap } = useTypedSelector(modelSelector);

  const dispatch = useTypedDispatch();

  const hanleOpenMonitorDrawer = useCallback(
    (alertRule: AlertRule) => {
      dispatch(getAlertsByAlertRuleId(alertRule.id));
      dispatch(setAlertRule(alertRule));
      dispatch(getMonitor(alertRule.monitor_id));
      dispatch(
        runMonitor({
          monitorId: alertRule.monitor_id,
          endTime: modelsMap[alertRule.model_id].latest_time,
        })
      );
      setOpenAlertDrawer(true);
    },
    [setOpenAlertDrawer]
  );

  const hanleCloseMonitorDrawer = useCallback(() => {
    dispatch(clearMonitorGraph());
    setOpenAlertDrawer(false);
  }, [setOpenAlertDrawer]);

  const handleOpenDialog = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, alertRule: AlertRule) => {
      event.stopPropagation();
      dispatch(setAlertRule(alertRule));
      setOpen(true);
    },
    [setOpen]
  );

  const handleDialogClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const resolve = useCallback((alertRuleId: ID) => {
    dispatch(resolveAllAlerts(alertRuleId));
    setNotification(true);
    setOpen(false);
  }, []);

  const handleCloseSuccess = () => {
    setNotification(false);
  };

  useEffect(() => {
    dispatch(getModels());
    if (count) {
      dispatch(getAlertsCount());
    }
  }, []);

  return (
    <>
      <AlertHeader />
      <StyledAlertContainer>
        <AlertFilters />
        <StyledList>
          {alertRules.map((alertRule) => (
            <StyledListItem key={alertRule.id}>
              <AlertRuleItem
                alertRule={alertRule}
                onOpenDialog={handleOpenDialog}
                onOpenDrawer={hanleOpenMonitorDrawer}
              />
            </StyledListItem>
          ))}
        </StyledList>
      </StyledAlertContainer>
      <AlertDrawer
        anchor="right"
        open={openAlertDrawer}
        onClose={hanleCloseMonitorDrawer}
      />
      <AlertSnackbar
        anchorOrigin={snackbarPosition}
        open={notification}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        severity={error ? "error" : "success"}
      >
        <Box>{error ? "Something went wrong" : "success"}</Box>
      </AlertSnackbar>
      <AlertResolveDialog
        open={open}
        onClose={handleDialogClose}
        resolve={resolve}
      />
    </>
  );
}
