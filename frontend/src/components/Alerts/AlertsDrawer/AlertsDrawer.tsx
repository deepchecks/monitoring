import React, { useEffect, useState, memo, useMemo } from 'react';

import {
  AlertRuleInfoSchema,
  useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  SingleCheckRunOptions,
  AlertSchema
} from 'api/generated';

import { useModels } from 'helpers/hooks/useModels';

import { Box, DrawerProps, styled, Typography } from '@mui/material';

import { AlertsDrawerHeader } from './components/AlertsDrawerHeader';
import { CustomDrawer } from '../../CustomDrawer';
import { AlertsDrillDownToAnalysis } from './components/AlertsDrillDownToAnalysis';
import { AlertsDrawerDiagram } from './components/AlertsDrawerDiagram';
import { unionCheckConf } from 'helpers/utils/checkUtil';
import { FrequencyMap } from 'helpers/utils/frequency';

interface AlertsDrawerProps extends DrawerProps {
  alertRule: AlertRuleInfoSchema | null;
  onClose: () => void;
  resolved?: boolean;
}

const AlertsDrawerComponent = ({ onClose, alertRule, resolved, ...props }: AlertsDrawerProps) => {
  const [alertIndex, setAlertIndex] = useState(0);
  const [alerts, setAlerts] = useState<AlertSchema[]>([]);

  const {
    data: initialAlerts = [],
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
    isError
  } = useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet(
    alertRule?.id || -1,
    { resolved: !!resolved },
    {
      query: {
        enabled: false
      }
    }
  );

  useEffect(() => {
    if (initialAlerts.length) {
      const sortedAlerts = [...initialAlerts].sort(
        (a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime()
      );
      setAlerts(sortedAlerts);
      setAlertIndex(sortedAlerts.length - 1);
    }
  }, [initialAlerts]);

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
  const singleCheckRunOptions = useMemo(
    () =>
      ({
        start_time: alert?.start_time,
        end_time: alert?.end_time,
        filter: monitor?.data_filters || { filters: [] },
        additional_kwargs: {
          check_conf: unionCheckConf(monitor?.check?.config?.params, monitor?.additional_kwargs?.check_conf),
          res_conf: monitor?.additional_kwargs?.res_conf
        }
      } as SingleCheckRunOptions),
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
    const monitorFrequency = (monitor && FrequencyMap[monitor?.frequency]) || 0;

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

  const handleCloseDrawer = () => {
    setAlerts([]);
    onClose();
  };

  return (
    <CustomDrawer loading={isLoading} onClose={handleCloseDrawer} {...props}>
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
              setAlerts={setAlerts}
              alertRule={alertRule}
              onClose={onClose}
              monitor={monitor}
              modelVersionId={modelVersionId}
              singleCheckRunOptions={singleCheckRunOptions}
              currentModel={currentModel}
              resolved={resolved}
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
