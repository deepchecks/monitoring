import React, { useState } from 'react';

import { getAlertFilters, resetAlertFilters } from '../helpers/context';

import {
  AlertRuleConfigSchema,
  GetAlertRulesApiV1AlertRulesGetParams,
  GetAllAlertRulesApiV1ConfigAlertRulesGetParams,
  useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete,
  useGetAllAlertRulesApiV1ConfigAlertRulesGet
} from '../api/generated';

import { Button, Box } from '@mui/material';

import { events, reportEvent } from 'helpers/services/mixPanel';

import HeaderLayout from 'components/HeaderLayout';
import { AlertRuleConfigItem } from 'components/AlertRuleConfig/AlertRuleConfigItem';
import { Loader } from 'components/Loader';
import { FiltersSort } from 'components/FiltersSort/FiltersSort';

import { WhitePlusIcon } from 'assets/icon/icon';
import NoResults from 'components/NoResults';
import { AlertRuleDialog } from 'components/AlertRuleDialog/AlertRuleDialog';
import { AlertRuleDialogProvider } from 'components/AlertRuleDialog/AlertRuleDialogContext';

export const AlertRules = () => {
  const [alertFilters, setAlertFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>(
    getAlertFilters() as GetAlertRulesApiV1AlertRulesGetParams
  );
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editableAlertRuleId, setEditableAlertRuleId] = useState<AlertRuleConfigSchema['id'] | undefined>(undefined);

  const {
    data: alertRules = [],
    isLoading: isAlertRulesLoading,
    refetch: refetchAlertRules
  } = useGetAllAlertRulesApiV1ConfigAlertRulesGet(alertFilters as GetAllAlertRulesApiV1ConfigAlertRulesGetParams);

  const { mutateAsync: deleteAlertRuleById, isLoading: isDeleteAlertRuleLoading } =
    useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete();

  const onDialogClose = (isRefetch = false) => {
    isRefetch && refetchAlertRules();
    setIsDialogOpen(false);
    setEditableAlertRuleId(undefined);
  };

  const onDialogOpen = (alertRule?: AlertRuleConfigSchema) => {
    reportEvent(`Click on the ${alertRule ? 'Edit' : 'Add'} rule`);

    setIsDialogOpen(true);
    setEditableAlertRuleId(alertRule?.id);
  };

  const onAlertRuleDelete = async (alertRule: AlertRuleConfigSchema) => {
    reportEvent(events.alertRulesPage.clickedDeleteRule);

    await deleteAlertRuleById({ alertRuleId: alertRule.id });
    refetchAlertRules();
  };

  const isLoading = isAlertRulesLoading || isDeleteAlertRuleLoading;

  return (
    <Box>
      <HeaderLayout>
        <Button
          sx={{
            height: '40px'
          }}
          disableElevation
          startIcon={<WhitePlusIcon />}
          onClick={() => onDialogOpen()}
        >
          New Alert Rule
        </Button>
      </HeaderLayout>
      <Box
        sx={{
          padding: '40px 0 ',
          width: '100%'
        }}
      >
        <FiltersSort alertFilters={alertFilters} setAlertFilters={setAlertFilters} isFilterByTimeLine={false} />
        <Box
          sx={{
            padding: 0,
            marginTop: '40px',
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}
        >
          {isLoading ? (
            <Loader />
          ) : alertRules.length !== 0 ? (
            alertRules.map(alertRule => (
              <AlertRuleConfigItem
                key={alertRule.id}
                onEdit={() => onDialogOpen(alertRule)}
                alertRule={alertRule}
                onDelete={() => onAlertRuleDelete(alertRule)}
              />
            ))
          ) : (
            <NoResults marginTop="184px" handleReset={() => resetAlertFilters(setAlertFilters)} />
          )}
        </Box>
      </Box>

      <AlertRuleDialogProvider>
        <AlertRuleDialog open={isDialogOpen} onClose={onDialogClose} alertRuleId={editableAlertRuleId} />
      </AlertRuleDialogProvider>
    </Box>
  );
};

export default AlertRules;
