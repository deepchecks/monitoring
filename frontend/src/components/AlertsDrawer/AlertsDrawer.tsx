import React, { useEffect, useState, memo, useMemo } from 'react';

import {
  AlertRuleInfoSchema,
  useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  SingleCheckRunOptions
} from 'api/generated';

import useRunMonitorLookback from 'hooks/useRunMonitorLookback';
import { useModels } from 'hooks/useModels';
import useAlertMonitorData from 'hooks/useAlertMonitorData';

import { Box, DrawerProps, Typography, styled } from '@mui/material';

import { AlertsDrawerHeader } from './components/AlertsDrawerHeader';
import DiagramLine from '../DiagramLine/DiagramLine';
import { CustomDrawer } from '../CustomDrawer';
import { AlertsDrillDownToAnalysis } from './components/AlertsDrillDownToAnalysis';

interface AlertsDrawerProps extends DrawerProps {
  alertRule: AlertRuleInfoSchema | null;
  onResolve: () => void;
  onClose: () => void;
}

const AlertsDrawerComponent = ({ onClose, onResolve, alertRule, ...props }: AlertsDrawerProps) => {
  const { isLoading: isModelMapLoading, getCurrentModel } = useModels();
  const currentModel = useMemo(() => alertRule && getCurrentModel(alertRule.model_id), [alertRule, getCurrentModel]);
  const { graphData, isLoading: isGraphDataLoading } = useAlertMonitorData(alertRule, currentModel?.latest_time);

  const [alertIndex, setAlertIndex] = useState(0);
  const [expand, setExpand] = useState(true);

  useRunMonitorLookback(alertRule?.monitor_id ?? null, currentModel);

  const {
    data: alerts = [],
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
    isError
  } = useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet(alertRule?.id as number, {
    query: {
      enabled: false
    }
  });

  const {
    data: monitor = null,
    isLoading: isMonitorLoading,
    refetch: refetchMonitor
  } = useGetMonitorApiV1MonitorsMonitorIdGet(alertRule?.monitor_id as number, {
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

  const isLoading = isAlertsLoading || isMonitorLoading || isModelMapLoading || isGraphDataLoading;

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
          <StyledHeaderContainer>
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
            <DiagramLine
              data={graphData}
              height={{ lg: 280, xl: 350 }}
              minimap={{
                alerts: alerts,
                alertSeverity: alertRule.alert_severity || 'low',
                alertIndex: alertIndex,
                changeAlertIndex: setAlertIndex
              }}
              minTimeUnit={monitor && monitor.frequency < 86400 ? 'hour' : 'day'}
              timeFreq={monitor?.frequency}
              alert_rules={[alertRule]}
              expand={expand}
            />
          </StyledHeaderContainer>
          {alertRule?.model_id && monitor?.frequency && (
            <AlertsDrillDownToAnalysis
              modelId={alertRule.model_id}
              period={period}
              monitor={monitor}
              modelVersionId={modelVersionId}
              singleCheckRunOptions={singleCheckRunOptions}
              expand={expand}
              setExpand={setExpand}
            />
          )}
        </>
      )}
    </CustomDrawer>
  );
};

const StyledHeaderContainer = styled(Box)({
  marginBottom: '60px',
  padding: '16px 40px'
});

export const AlertsDrawer = memo(AlertsDrawerComponent);
