import React, { useCallback, useContext, useState } from 'react';
import mixpanel from 'mixpanel-browser';

import {
  AlertRuleInfoSchema,
  useGetAlertRulesApiV1AlertRulesGet,
  useResolveAllAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdResolveAllPost,
  useReactivateResolvedAlertsApiV1AlertRulesAlertRuleIdAlertsReactivateResolvedPost
} from 'api/generated';

import { GlobalStateContext } from 'context';

import { Box, List, ListItem, styled } from '@mui/material';

import { AlertsDrawer } from 'components/AlertsDrawer';
import { FiltersSort } from 'components/FiltersSort/FiltersSort';
import { AlertsHeader } from 'components/AlertsHeader';
import { AlertsResolveDialog } from 'components/AlertsResolveDialog';
import { AlertsRulesItem } from 'components/AlertsRulesItem';
import { AlertsSnackbar } from 'components/AlertsSnackbar';
import { Loader } from 'components/Loader';
import NoResults from 'components/NoResults';

const snackbarPosition = {
  vertical: 'bottom',
  horizontal: 'right'
} as const;

interface AlertsPageProps {
  resolved?: boolean;
}

export const AlertsPage = ({ resolved=false }: AlertsPageProps) => {
  const { alertFilters, resetFilters } = useContext(GlobalStateContext);

  const [resolveAlertRule, setResolveAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [drawerAlertRule, setDrawerAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [isNotification, setIsNotification] = useState(false);


  const { data: alertRules, isLoading: alertRulesIsLoading, isError: isAlertRulesError } = useGetAlertRulesApiV1AlertRulesGet({...alertFilters, resolved: resolved});
  const {
    mutateAsync: resolveAllAlerts,
    isError: resolveAllAlertsError,
    isLoading: resolveAllAlertsIsLoading
  } = useResolveAllAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdResolveAllPost();
  const {
    mutateAsync: reactivateAllAlerts,
    isError: reactivateAllAlertsError,
    isLoading: reactivateAllAlertsIsLoading
  } = useReactivateResolvedAlertsApiV1AlertRulesAlertRuleIdAlertsReactivateResolvedPost();

  const onResolve = useCallback(
    async (alertRule: AlertRuleInfoSchema | null) => {
      if (!alertRule) throw Error('Missing alertRule');

      resolved
        ? await reactivateAllAlerts({ alertRuleId: alertRule.id })
        : await resolveAllAlerts({ alertRuleId: alertRule.id });
      setIsNotification(true);
      setResolveAlertRule(null);

      mixpanel.track('Resolve alerts');
    },
    [reactivateAllAlerts, resolveAllAlerts, resolved]
  );

  const handleCloseSuccess = () => setIsNotification(false);

  const isError = isAlertRulesError || resolveAllAlertsError || reactivateAllAlertsError;
  const isLoading = reactivateAllAlertsIsLoading || resolveAllAlertsIsLoading;

  return (
    <>
      <AlertsHeader resolved={resolved} />
      <Box>
        <FiltersSort />
        <StyledList>
          {alertRulesIsLoading ? (
            <Loader />
          ) : alertRules?.length ? (
            (alertRules || []).map(alertRule => (
              <StyledListItem key={alertRule.id}>
                <AlertsRulesItem
                  alertRule={alertRule}
                  onResolveOpen={() => setResolveAlertRule(alertRule)}
                  onDrawerOpen={() => setDrawerAlertRule(alertRule)}
                  resolved={resolved}
                />
              </StyledListItem>
            ))
          ) : (
            <NoResults marginTop="207" handleReset={resetFilters} />
          )}
        </StyledList>
      </Box>
      <AlertsDrawer
        anchor="right"
        open={!!drawerAlertRule}
        alertRule={drawerAlertRule}
        onClose={() => setDrawerAlertRule(null)}
        resolved={resolved}
      />
      <AlertsSnackbar
        anchorOrigin={snackbarPosition}
        open={isNotification}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        severity={isError ? 'error' : 'success'}
      >
        <Box>{isError ? 'Something went wrong' : 'Success'}</Box>
      </AlertsSnackbar>
      <AlertsResolveDialog
        open={!!resolveAlertRule}
        onClose={() => setResolveAlertRule(null)}
        alertRule={resolveAlertRule}
        onResolve={() => onResolve(resolveAlertRule)}
        isLoading={isLoading}
      />
    </>
  );
};

const StyledList = styled(List)({
  padding: 0,
  marginTop: '40px'
});

const StyledListItem = styled(ListItem)({
  padding: 0,
  margin: '20px 0',
  ':first-of-type': {
    marginTop: 0
  }
});

export default AlertsPage;
