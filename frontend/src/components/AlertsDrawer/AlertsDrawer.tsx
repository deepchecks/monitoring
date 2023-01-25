import React, { useEffect, useState, memo, useMemo } from 'react';

import {
  AlertRuleInfoSchema,
  useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  SingleCheckRunOptions
} from 'api/generated';

import { useModels } from 'hooks/useModels';

import { Box, DrawerProps, styled, Typography } from '@mui/material';

import { AlertsDrawerHeader } from './components/AlertsDrawerHeader';
import { CustomDrawer } from '../CustomDrawer';
import { AlertsDrillDownToAnalysis } from './components/AlertsDrillDownToAnalysis';
import { AlertsDrawerDiagram } from './components/AlertsDrawerDiagram';

interface AlertsDrawerProps extends DrawerProps {
  alertRule: AlertRuleInfoSchema | null;
  onResolve: () => void;
  onClose: () => void;
}

const AlertsDrawerComponent = ({ onClose, onResolve, alertRule, ...props }: AlertsDrawerProps) => {
  const [alertIndex, setAlertIndex] = useState(0);

  const {
    data: alerts = [],
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
    isError
  } = useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet(
    alertRule?.id as number,
    { resolved: false },
    {
      query: {
        enabled: false
      }
    }
  );

  useEffect(() => {
    if (alerts.length) {
      setAlertIndex(alerts.length - 1);
    }
  }, [alerts]);

  const { isLoading: isModelMapLoading, getCurrentModel } = useModels();
  const currentModel = useMemo(() => alertRule && getCurrentModel(alertRule.model_id), [alertRule, getCurrentModel]);

  const {
    data: monitor = null,
    isLoading: isMonitorLoading,
    refetch: refetchMonitor
  } = useGetMonitorApiV1MonitorsMonitorIdGet(alertRule?.monitor_id || -1, {
    query: {
      enabled: false
    }
  });

  const alert = useMemo(() => alerts[alertIndex], [alertIndex, alerts]);
  const singleCheckRunOptions: SingleCheckRunOptions = useMemo(
    () => ({
      start_time: alert?.start_time,
      end_time: alert?.end_time,
      filter: monitor?.data_filters || { filters: [] }
    }),
    [alert?.end_time, alert?.start_time, monitor?.data_filters]
  );

  const modelVersionName = useMemo(
    () => (alert?.failed_values ? Object.keys(alert.failed_values)[0] : ''),
    [alert?.failed_values]
  );
  const modelVersionId = useMemo(
    () => currentModel?.versions.find(v => v.name == modelVersionName)?.id,
    [currentModel?.versions, modelVersionName]
  );

  const period: [Date, Date] = useMemo(() => {
    const monitorFrequency = monitor?.frequency || 0;

    return [
      new Date(new Date(alerts[alertIndex]?.start_time).getTime() - 3 * monitorFrequency * 1000),
      new Date(new Date(alerts[alertIndex]?.end_time).getTime() + 3 * monitorFrequency * 1000)
    ];
  }, [alertIndex, alerts, monitor?.frequency]);

  const isLoading = isAlertsLoading || isMonitorLoading || isModelMapLoading;

  useEffect(() => {
    if (alertRule) {
      refetchAlerts();
      refetchMonitor();
    }
  }, [alertRule, refetchAlerts, refetchMonitor]);

  return (
    <CustomDrawer loading={isLoading} onClose={onClose} {...props}>
      {isError || !alertRule ? (
        <Typography variant="h4" padding="40px">
          Something went wrong...
        </Typography>
      ) : (
        <>
          <StyledStickyHeader>
            <AlertsDrawerHeader
              alertIndex={alertIndex}
              changeAlertIndex={setAlertIndex}
              alert={alert}
              alerts={alerts}
              alertRule={alertRule}
              onClose={onClose}
              onResolve={onResolve}
              monitor={monitor}
              modelVersionId={modelVersionId}
              singleCheckRunOptions={singleCheckRunOptions}
              currentModel={currentModel}
            />
          </StyledStickyHeader>
          <AlertsDrawerDiagram
            monitor={monitor}
            alerts={alerts}
            alertRule={alertRule}
            alertIndex={alertIndex}
            setAlertIndex={setAlertIndex}
            currentModel={currentModel}
          />
          {alertRule?.model_id && monitor?.frequency && (
            <AlertsDrillDownToAnalysis
              modelId={alertRule.model_id}
              period={period}
              monitor={monitor}
              modelVersionId={modelVersionId}
              singleCheckRunOptions={singleCheckRunOptions}
            />
          )}
        </>
      )}
    </CustomDrawer>
  );
};

const StyledStickyHeader = styled(Box)({
  position: 'sticky',
  top: 0,
  zIndex: 999,
  padding: '40px 40px 0',
  background: 'inherit'
});

export const AlertsDrawer = memo(AlertsDrawerComponent);
