import React, { useEffect, useState } from 'react';
import { Box, Drawer, DrawerProps, styled, Typography } from '@mui/material';
import { useModels } from 'hooks/useModels';
import {
  AlertRuleInfoSchema,
  useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet,
  useGetMonitorApiV1MonitorsMonitorIdGet
} from '../api/generated';
import useMonitorData from '../hooks/useAlertMonitorData';
import { AlertsDrawerHeader } from './AlertsDrawerHeader';
import DiagramLine from './DiagramLine';
import { Loader } from './Loader';

interface AlertsDrawerProps extends DrawerProps {
  alertRule: AlertRuleInfoSchema | null;
  onResolve: () => void;
  onClose: () => void;
}

export const AlertsDrawer = ({ onClose, onResolve, alertRule, ...props }: AlertsDrawerProps) => {
  const { modelsMap, isLoading: isModelMapLoading } = useModels();
  const { graphData, isLoading: isGraphDataLoading } = useMonitorData(
    alertRule,
    alertRule ? modelsMap[alertRule.model_id]?.latest_time : undefined
  );

  const [alertIndex, setAlertIndex] = useState(0);

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

  const isLoading = isAlertsLoading || isMonitorLoading || isModelMapLoading || isGraphDataLoading;

  useEffect(() => {
    if (alertRule) {
      refetchAlerts();
      refetchMonitor();
    }
  }, [alertRule]);

  if (isError) {
    return (
      <StyledDrawer onClose={onClose} {...props}>
        <Typography variant="h4">Something went wrong...</Typography>
      </StyledDrawer>
    );
  }
  return (
    <StyledDrawer onClose={onClose} {...props}>
      {isLoading || !alertRule ? (
        <Loader />
      ) : (
        <>
          <AlertsDrawerHeader
            alertIndex={alertIndex}
            alerts={alerts}
            alertRule={alertRule}
            changeAlertIndex={setAlertIndex}
            onClose={onClose}
            onResolve={onResolve}
            monitor={monitor}
          />
          <StyledDiagramWrapper>
            {/* eslint-disable @typescript-eslint/ban-ts-comment */}
            <DiagramLine
              alerts={alerts}
              alertIndex={alertIndex}
              changeAlertIndex={setAlertIndex}
              //@ts-ignore
              data={graphData}
              height={350}
              minimap={{
                alerts: alerts,
                alertSeverity: alertRule.alert_severity || 'low',
                alertIndex: alertIndex,
                changeAlertIndex: setAlertIndex
              }}
              alert_rules={[alertRule]}
            />
            {/* eslint-enable @typescript-eslint/ban-ts-comment */}
          </StyledDiagramWrapper>
        </>
      )}
    </StyledDrawer>
  );
};

const StyledDrawer = styled(Drawer)({
  '& .MuiPaper-root': {
    width: 1090
  }
});

const StyledDiagramWrapper = styled(Box)({
  margin: '0 40px 0 40px'
});
