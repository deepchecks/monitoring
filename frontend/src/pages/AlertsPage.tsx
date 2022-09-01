import { Box, List, styled } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
// import { AlertSnackbar } from '../../components/AlertSnackbar/AlertSnackbar';
// import { AlertDrawer } from '../../content/alert/AlertDrawer/AlertDrawer';
import { AlertsFilters } from '../components/AlertsFilters';
import { AlertsHeader } from '../components/AlertsHeader';
import {
  AlertRuleInfoSchema,
  GetAlertRulesApiV1AlertRulesGetParams,
  useGetAlertRulesApiV1AlertRulesGet,
  useResolveAllAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdResolveAllPost
} from '../api/generated';
import { Loader } from '../components/Loader';
import { AlertsRulesItem } from '../components/AlertsRulesItem';
import { AlertsResolveDialog } from '../components/AlertsResolveDialog';
import { AlertsSnackbar } from '../components/AlertsSnackbar';
import { AlertsDrawer } from '../components/AlertsDrawer';
import useRunMonitorLookback from 'hooks/useRunMonitorLookback';

const snackbarPosition = {
  vertical: 'bottom',
  horizontal: 'right'
} as const;

export const AlertsPage = () => {
  const [resolveAlertRule, setResolveAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [drawerAlertRule, setDrawerAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [isNotification, setIsNotification] = useState<boolean>(false);
  const [filters, setFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>({});

  const { data: alertRules, isLoading, isError: isAlertRulesError } = useGetAlertRulesApiV1AlertRulesGet(filters);
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
  }, []);

  const handleCloseSuccess = () => setIsNotification(false);

  const isError = isAlertRulesError || isAlertRuleResolveError;

  return (
    <>
      <AlertsHeader />
      <StyledAlertContainer>
        <AlertsFilters onChange={setFilters} />
        <StyledList>
          {isLoading ? (
            <Loader />
          ) : (
            (alertRules || []).map(alertRule => (
              <StyledListItem key={alertRule.id}>
                <AlertsRulesItem
                  alertRule={alertRule}
                  onResolveOpen={() => setResolveAlertRule(alertRule)}
                  onDrawerOpen={() => setDrawerAlertRule(alertRule)}
                />
              </StyledListItem>
            ))
          )}
        </StyledList>
      </StyledAlertContainer>
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

const StyledAlertContainer = styled(Box)(({ theme }) => ({
  padding: '40px 40px 0',
  width: '100%',
  [theme.breakpoints.down(1381)]: {
    marginLeft: '83px'
  }
}));

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
