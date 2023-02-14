import React, { useCallback, useState } from 'react';

import {
  AlertRuleInfoSchema,
  useGetAlertRulesApiV1AlertRulesGet,
  useResolveAllAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdResolveAllPost,
  useReactivateResolvedAlertsApiV1AlertRulesAlertRuleIdAlertsReactivateResolvedPost,
  GetAlertRulesApiV1AlertRulesGetParams
} from 'api/generated';

import { getAlertFilters, resetAlertFilters } from 'context';

import { Box, List, ListItem, styled } from '@mui/material';

import { events, reportEvent } from 'helpers/mixPanel';

import { AlertsDrawer } from 'components/AlertsDrawer';
import { FiltersSort } from 'components/FiltersSort/FiltersSort';
import { AlertsHeader } from 'components/AlertsHeader';
import { AlertsResolveDialog } from 'components/AlertsResolveDialog';
import { AlertsRulesItem } from 'components/AlertRulesItem';
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

export const AlertsPage = ({ resolved = false }: AlertsPageProps) => {
  const [alertFilters, setAlertFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>(getAlertFilters() as GetAlertRulesApiV1AlertRulesGetParams);

  const [resolveAlertRule, setResolveAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [drawerAlertRule, setDrawerAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [isNotification, setIsNotification] = useState(false);

  const {
    data: alertRules,
    isLoading: alertRulesIsLoading,
    isError: isAlertRulesError
  } = useGetAlertRulesApiV1AlertRulesGet({ ...alertFilters, resolved: resolved });
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

      reportEvent(events.resolveAlerts);
    },
    [reactivateAllAlerts, resolveAllAlerts, resolved]
  );

  const handleCloseSuccess = () => setIsNotification(false);

  const isError = isAlertRulesError || resolveAllAlertsError || reactivateAllAlertsError;
  const isLoading = reactivateAllAlertsIsLoading || resolveAllAlertsIsLoading;

  return (
    <>
      <AlertsHeader resolved={resolved ? 1 : 0} />
      <Box>
        <FiltersSort alertFilters={alertFilters} setAlertFilters={setAlertFilters}/>
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
                  resolved={resolved ? 1 : 0}
                />
              </StyledListItem>
            ))
          ) : (
            <NoResults marginTop="207" handleReset={() => resetAlertFilters(setAlertFilters)} />
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
