import React, { useEffect, useState } from 'react';

import { MonitorSchema, AlertRuleInfoSchema, AlertSchema, ModelManagmentSchema, Frequency } from 'api/generated';

import useAlertMonitorData from 'helpers/hooks/useAlertMonitorData';
import { FrequencyMap, frequencyValues } from 'helpers/utils/frequency';

import { Box } from '@mui/material';

import DiagramLine from 'components/DiagramLine/DiagramLine';

interface AlertsDrawerDiagramProps {
  alertRule: AlertRuleInfoSchema;
  alerts: AlertSchema[];
  currentModel: ModelManagmentSchema | null;
  alertIndex: number;
  setAlertIndex: React.Dispatch<React.SetStateAction<number>>;
  monitor: MonitorSchema | null;
}

export const AlertsDrawerDiagram = ({
  alertRule,
  alerts,
  currentModel,
  alertIndex,
  setAlertIndex,
  monitor
}: AlertsDrawerDiagramProps) => {
  const [alertMonitorDataTime, setAlertMonitorDataTime] = useState(currentModel?.latest_time);

  const { graphData, isLoading: isGraphDataLoading } = useAlertMonitorData(alertRule, alertMonitorDataTime, alerts);

  const minTimeUnit = monitor && monitor.frequency === Frequency['HOUR'] ? 'hour' : 'day';
  const timeFreq = monitor ? FrequencyMap[monitor?.frequency] : frequencyValues.DAY;

  useEffect(() => {
    if (graphData.labels.length > 0 && alerts[alertIndex]?.end_time) {
      const currentAlertEndTime = new Date(alerts[alertIndex].end_time).getTime();

      if (graphData.labels.includes(currentAlertEndTime)) return;

      const time = currentAlertEndTime / 1000;
      setAlertMonitorDataTime(prevTime => {
        const alertsLength = alerts.length - 1;
        const forwardIndex = alertIndex + 6;
        const aheadByAWeek =
          new Date(alerts[forwardIndex > alertsLength ? alertsLength : forwardIndex].end_time).getTime() / 1000;

        return prevTime && time > prevTime ? aheadByAWeek : time;
      });
    }
  }, [alertIndex, alerts, graphData.labels]);

  return (
    <Box padding="16px 40px" minHeight={{ lg: 350, xl: 420 }}>
      <DiagramLine
        data={graphData}
        height={{ lg: 280, xl: 350 }}
        alertsWidget={{
          alerts: alerts,
          alertSeverity: alertRule?.alert_severity || 'low',
          alertIndex: alertIndex,
          changeAlertIndex: setAlertIndex
        }}
        minTimeUnit={minTimeUnit}
        timeFreq={timeFreq}
        alert_rules={[alertRule]}
        isLoading={isGraphDataLoading}
      />
    </Box>
  );
};
