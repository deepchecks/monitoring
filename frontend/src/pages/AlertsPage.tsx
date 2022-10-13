import React, { useCallback, useContext, useState } from 'react';
import mixpanel from 'mixpanel-browser';

import { GlobalStateContext } from 'Context';
import useRunMonitorLookback from 'hooks/useRunMonitorLookback';

import {
  AlertRuleInfoSchema,
  useGetAlertRulesApiV1AlertRulesGet,
  useResolveAllAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdResolveAllPost
} from '../api/generated';

import { Box, List, styled, Typography } from '@mui/material';

// import { AlertSnackbar } from '../../components/AlertSnackbar/AlertSnackbar';
// import { AlertDrawer } from '../../content/alert/AlertDrawer/AlertDrawer';
import { AlertsDrawer } from '../components/AlertsDrawer';
import { AlertsFilters } from '../components/AlertsFilters';
import { AlertsHeader } from '../components/AlertsHeader';
import { AlertsResolveDialog } from '../components/AlertsResolveDialog';
import { AlertsRulesItem } from '../components/AlertsRulesItem';
import { AlertsSnackbar } from '../components/AlertsSnackbar';
import { Loader } from '../components/Loader';

import { EmptyAlerts } from 'assets/bg/backgrounds';

const snackbarPosition = {
  vertical: 'bottom',
  horizontal: 'right'
} as const;

export const AlertsPage = () => {
  const { alertFilters, resetFilters } = useContext(GlobalStateContext);

  const [resolveAlertRule, setResolveAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [drawerAlertRule, setDrawerAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [isNotification, setIsNotification] = useState<boolean>(false);

  const { data: alertRules, isLoading, isError: isAlertRulesError } = useGetAlertRulesApiV1AlertRulesGet(alertFilters);
  const {
    mutateAsync: mutateAlertRuleResolve,
    isError: isAlertRuleResolveError,
    isLoading: isAlertRuleResolveLoading
  } = useResolveAllAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdResolveAllPost();

  useRunMonitorLookback(drawerAlertRule?.monitor_id ?? null, drawerAlertRule?.model_id?.toString() ?? null);

  const onResolve = useCallback(async (alertRule: AlertRuleInfoSchema | null) => {
    if (!alertRule) throw Error('Missing alertRule');
    await mutateAlertRuleResolve({ alertRuleId: alertRule.id });
    setIsNotification(true);
    setResolveAlertRule(null);

    mixpanel.track('Resolve alerts');
  }, []);

  const handleCloseSuccess = () => setIsNotification(false);

  const isError = isAlertRulesError || isAlertRuleResolveError;

  return (
    <>
      <AlertsHeader />
      <Box>
        <AlertsFilters />
        <StyledList>
          {isLoading ? (
            <Loader />
          ) : alertRules?.length ? (
            (alertRules || []).map(alertRule => (
              <StyledListItem key={alertRule.id}>
                <AlertsRulesItem
                  alertRule={alertRule}
                  onResolveOpen={() => setResolveAlertRule(alertRule)}
                  onDrawerOpen={() => setDrawerAlertRule(alertRule)}
                />
              </StyledListItem>
            ))
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: '207px' }}>
              <Box width={444}>
                <EmptyAlerts />
                <Typography
                  variant="body1"
                  sx={{
                    mt: '60px',
                    color: theme => theme.palette.text.disabled,
                    textAlign: 'center',
                    padding: '0 20px'
                  }}
                >
                  No results found for the applied filters maybe try to{' '}
                  <Typography
                    sx={{ color: theme => theme.palette.primary.main, cursor: 'pointer' }}
                    component={'span'}
                    onClick={resetFilters}
                  >
                    reset the filters
                  </Typography>{' '}
                  and start over
                </Typography>
              </Box>
            </Box>
          )}
        </StyledList>
      </Box>
      <AlertsDrawer
        anchor="right"
        open={!!drawerAlertRule}
        alertRule={drawerAlertRule}
        onResolve={() => onResolve(drawerAlertRule)}
        onClose={() => setDrawerAlertRule(null)}
      />
      <AlertsSnackbar
        anchorOrigin={snackbarPosition}
        open={isNotification}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        severity={isError ? 'error' : 'success'}
      >
        <Box>{isError ? 'Something went wrong' : 'success'}</Box>
      </AlertsSnackbar>

      <AlertsResolveDialog
        open={!!resolveAlertRule}
        onClose={() => setResolveAlertRule(null)}
        alertRule={resolveAlertRule}
        onResolve={() => onResolve(resolveAlertRule)}
        isLoading={isAlertRuleResolveLoading}
      />
    </>
  );
};

const StyledList = styled(List)({
  padding: 0,
  marginTop: '40px'
});

const StyledListItem = styled(List)({
  padding: 0,
  margin: '20px 0',
  ':first-of-type': {
    marginTop: 0
  },
  ':last-of-type': {
    marginBottom: 0
  }
});
