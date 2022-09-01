import React from 'react';
import { Box, Drawer, DrawerProps, styled } from '@mui/material';
import DiagramLine from './DiagramLine';
import { AlertsDrawerHeader } from './AlertsDrawerHeader';
import { AlertRuleInfoSchema } from '../api/generated';
import useMonitorData from '../hooks/useAlertMonitorData';

interface AlertsDrawerProps extends DrawerProps {
  alertRule: AlertRuleInfoSchema | null;
  onResolve: () => void;
  onClose: () => void;
}

export const AlertsDrawer = ({ onClose, onResolve, alertRule, ...props }: AlertsDrawerProps) => {
  const { graphData } = useMonitorData(alertRule);

  return (
    <StyledDrawer onClose={onClose} {...props}>
      {alertRule && (
        <>
          <AlertsDrawerHeader onResolve={onResolve} alertRule={alertRule} onClose={onClose} />
          <StyledDiagramWrapper>
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            <DiagramLine data={graphData} threshold={alertRule.condition?.value} />
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
  margin: '78px 40px 0 40px'
});
