import React, { useContext, useState } from 'react';
import mixpanel from 'mixpanel-browser';

import { GlobalStateContext } from '../context';

import {
  AlertRuleConfigSchema,
  GetAllAlertRulesApiV1ConfigAlertRulesGetParams,
  useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete,
  useGetAllAlertRulesApiV1ConfigAlertRulesGet
} from '../api/generated';

import { Button, Box } from '@mui/material';

import HeaderLayout from 'components/HeaderLayout';
import { AlertRuleConfigItem } from 'components/AlertRuleConfig/AlertRuleConfigItem';
import { Loader } from 'components/Loader';
import { FiltersSort } from 'components/FiltersSort/FiltersSort';

import { WhitePlusIcon } from 'assets/icon/icon';
import NoResults from 'components/NoResults';
import { AlertRuleDialog } from 'components/AlertRuleDialog/AlertRuleDialog';
import { AlertRuleDialogProvider } from 'components/AlertRuleDialog/AlertRuleDialogContext';

export const AlertRules = () => {
  const { alertFilters: filters, resetFilters } = useContext(GlobalStateContext);

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editableAlertRuleId, setEditableAlertRuleId] = useState<AlertRuleConfigSchema['id'] | undefined>(undefined);

  const {
    data: alertRules = [],
    isLoading: isAlertRulesLoading,
    refetch: refetchAlertRules
  } = useGetAllAlertRulesApiV1ConfigAlertRulesGet(filters as GetAllAlertRulesApiV1ConfigAlertRulesGetParams);

  const { mutateAsync: deleteAlertRuleById, isLoading: isDeleteAlertRuleLoading } =
    useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete();

  const onDialogClose = (isRefetch = false) => {
    isRefetch && refetchAlertRules();
    setIsDialogOpen(false);
    setEditableAlertRuleId(undefined);
  };

  const onDialogOpen = (alertRule?: AlertRuleConfigSchema) => {
    mixpanel.track(`Click on the ${alertRule ? 'Edit' : 'Add'} rule`);

    setIsDialogOpen(true);
    setEditableAlertRuleId(alertRule?.id);
  };

  const onAlertRuleDelete = async (alertRule: AlertRuleConfigSchema) => {
    mixpanel.track('Click on delete rule');

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
        <FiltersSort isFilterByTimeLine={false} />
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
            <NoResults marginTop="184px" handleReset={resetFilters} />
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
