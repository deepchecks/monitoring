import React, { useCallback, useEffect, useState } from 'react';

import { Box, List, ListItem, styled } from '@mui/material';

import {
  AlertRuleInfoSchema,
  useGetAlertRulesApiV1AlertRulesGet,
  useResolveAllAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdResolveAllPost,
  useReactivateResolvedAlertsApiV1AlertRulesAlertRuleIdAlertsReactivateResolvedPost,
  ModelManagmentSchema,
  GetAlertRulesApiV1AlertRulesGetParams
} from 'api/generated';

import { AlertsDrawer } from 'components/Alerts/AlertsDrawer';
import { FiltersSort } from 'components/FiltersSort/FiltersSort';
import { AlertsHeader } from 'components/Alerts/AlertsHeader';
import { AlertsRulesItem } from 'components/Alerts/AlertRulesItem';
import { AlertsSnackbar } from 'components/Alerts/AlertsSnackbar';
import { Loader } from 'components/base/Loader/Loader';
import { StyledDeletionDialog } from 'components/lib';
import NoResults from 'components/NoResults';

import useModels from '../helpers/hooks/useModels';
import { getAlertFilters, resetAlertFilters } from 'helpers/base/alertFilters';
import { getParams, handleSetParams } from 'helpers/utils/getParams';

const snackbarPosition = {
  vertical: 'bottom',
  horizontal: 'right'
} as const;

interface AlertsPageProps {
  resolved?: boolean;
}

function checkIsTwoWeeksOlder(
  models: ModelManagmentSchema[],
  alertFilters: GetAlertRulesApiV1AlertRulesGetParams,
  alertRules: AlertRuleInfoSchema[] | undefined
): boolean | undefined {
  if (alertRules?.length === 0 && alertFilters?.models) {
    const twoWeeksTimestamp = 1209600000;
    const currentTimestamp = Number(new Date());
    let selectedTimestamp: number | undefined;
    // with selected model
    if (alertFilters.models.length > 0) {
      const selectedModelId = alertFilters.models[0];
      const selectedModel = models.find(model => model.id === selectedModelId);
      // response in seconds from server
      selectedTimestamp = selectedModel?.latest_time && selectedModel.latest_time * 1000;
    }
    // without selected models
    if (alertFilters.models.length === 0) {
      // get all models' timestamps and find max of them in 1 loop
      selectedTimestamp = models.reduce((max, cur) => {
        if (cur.latest_time) return Math.max(cur.latest_time, max);
        else return Math.max(0, max);
      }, 0);
    }

    const modelEndTimeGap = selectedTimestamp && currentTimestamp - selectedTimestamp;
    return modelEndTimeGap !== undefined ? modelEndTimeGap >= twoWeeksTimestamp : undefined;
  }
}

export const AlertsPage = ({ resolved = false }: AlertsPageProps) => {
  const [alertFilters, setAlertFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>(
    getAlertFilters() as GetAlertRulesApiV1AlertRulesGetParams
  );

  const [resolveAlertRule, setResolveAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [drawerAlertRule, setDrawerAlertRule] = useState<AlertRuleInfoSchema | null>(null);
  const [isNotification, setIsNotification] = useState(false);
  const [isModelsEndTimeTwoWeeksOlder, setIsModelsEndTimeTwoWeeksOlder] = useState<boolean>(false);

  const {
    data: alertRules,
    isLoading: alertRulesIsLoading,
    isError: isAlertRulesError,
    refetch: refetchAlertRules
  } = useGetAlertRulesApiV1AlertRulesGet({ ...alertFilters, resolved: resolved });
  const { mutateAsync: resolveAllAlerts, isError: resolveAllAlertsError } =
    useResolveAllAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdResolveAllPost();
  const { mutateAsync: reactivateAllAlerts, isError: reactivateAllAlertsError } =
    useReactivateResolvedAlertsApiV1AlertRulesAlertRuleIdAlertsReactivateResolvedPost();
  const { models, isLoading: isModelsLoading } = useModels();

  const onResolve = useCallback(
    async (alertRule: AlertRuleInfoSchema | null) => {
      if (!alertRule) throw Error('Missing alertRule');

      resolved
        ? await reactivateAllAlerts({ alertRuleId: alertRule.id })
        : await resolveAllAlerts({ alertRuleId: alertRule.id });
      setIsNotification(true);
      setResolveAlertRule(null);
    },
    [reactivateAllAlerts, resolveAllAlerts, resolved]
  );

  const handleCloseSuccess = () => setIsNotification(false);

  const isError = isAlertRulesError || resolveAllAlertsError || reactivateAllAlertsError;

  // checking if the end time of a selected model is older than 2 week
  // if there are no alerts to show
  useEffect(() => {
    const isTwoWeeksOlder = checkIsTwoWeeksOlder(models, alertFilters, alertRules);
    if (isTwoWeeksOlder) setIsModelsEndTimeTwoWeeksOlder(isTwoWeeksOlder);
  }, [alertFilters, alertRules]);

  useEffect(() => {
    if (getParams().alertRuleId) {
      const alertRule = alertRules?.find(ar => ar.id === +getParams().alertRuleId);
      alertRule && setDrawerAlertRule(alertRule);
    }
  }, [alertRules]);

  const handleOpenDrawer = (alertRule: AlertRuleInfoSchema) => {
    handleSetParams('alertRuleId', alertRule.id);
    setDrawerAlertRule(alertRule);
  };

  const handleCloseDrawer = () => {
    setDrawerAlertRule(null);
    handleSetParams('alertRuleId');
  };

  const handleResolveAll = async () => {
    await onResolve(resolveAlertRule);
    refetchAlertRules();
  };

  return (
    <>
      <AlertsHeader resolved={resolved ? 1 : 0} />
      <Box>
        <FiltersSort alertFilters={alertFilters} setAlertFilters={setAlertFilters} />
        <StyledList>
          {alertRulesIsLoading || isModelsLoading ? (
            <Loader />
          ) : alertRules?.length ? (
            (Array.isArray(alertRules) ? alertRules : []).map(alertRule => (
              <StyledListItem key={alertRule.id}>
                <AlertsRulesItem
                  alertRule={alertRule}
                  onResolveOpen={() => setResolveAlertRule(alertRule)}
                  onDrawerOpen={() => handleOpenDrawer(alertRule)}
                  resolved={resolved ? 1 : 0}
                />
              </StyledListItem>
            ))
          ) : (
            <StyledNoResultsContainer>
              <NoResults
                isTwoWeeksOlder={isModelsEndTimeTwoWeeksOlder}
                handleReset={() => resetAlertFilters(setAlertFilters)}
                margin="0 auto"
              />
            </StyledNoResultsContainer>
          )}
        </StyledList>
      </Box>
      <AlertsDrawer
        anchor="right"
        open={!!drawerAlertRule}
        alertRule={drawerAlertRule}
        onClose={handleCloseDrawer}
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
      <StyledDeletionDialog
        open={!!resolveAlertRule}
        title="Resolve All"
        closeDialog={() => setResolveAlertRule(null)}
        submitButtonLabel="Yes, continue"
        submitButtonAction={handleResolveAll}
        cancelButtonLabel="No, cancel"
        alertTypeButtons={false}
        messageStart="You are about to resolve "
        itemToDelete={(resolveAlertRule?.alerts_count || 'all') + ' active alerts,'}
        messageEnd=" please confirm."
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

const StyledNoResultsContainer = styled(Box)({
  display: 'flex',
  height: 'calc(100vh - 350px)',
  alignItems: 'center'
});

export default AlertsPage;
