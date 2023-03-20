import React, { useState } from 'react';

import {
  AlertRuleConfigSchema,
  GetAlertRulesApiV1AlertRulesGetParams,
  GetAllAlertRulesApiV1ConfigAlertRulesGetParams,
  useGetAllAlertRulesApiV1ConfigAlertRulesGet
} from '../api/generated';

import { Box, styled } from '@mui/material';

import HeaderLayout from 'components/HeaderLayout';
import { AlertRuleConfigItem } from 'components/AlertRuleConfig/AlertRuleConfigItem';
import { Loader } from 'components/Loader';
import { FiltersSort } from 'components/FiltersSort/FiltersSort';
import NoResults from 'components/NoResults';
import { AlertRuleDialog } from 'components/AlertRuleDialog/AlertRuleDialog';
import { AlertRuleDialogProvider } from 'components/AlertRuleDialog/AlertRuleDialogContext';
import { DeleteAlertRule } from 'components/AlertRuleConfig/components/DeleteAlertRule';
import { MUIBaseButton } from 'components/base/Button/MUIBaseButton';

import { WhitePlusIcon } from 'assets/icon/icon';

import { getAlertFilters, resetAlertFilters } from '../helpers/context';
import { reportEvent } from 'helpers/services/mixPanel';

export const AlertRules = () => {
  const [alertFilters, setAlertFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>(
    getAlertFilters() as GetAlertRulesApiV1AlertRulesGetParams
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editableAlertRuleId, setEditableAlertRuleId] = useState<AlertRuleConfigSchema['id'] | undefined>();
  const [currentAlertRule, setCurrentAlertRule] = useState<AlertRuleConfigSchema | null>(null);

  const {
    data: alertRules = [],
    isLoading: isAlertRulesLoading,
    refetch
  } = useGetAllAlertRulesApiV1ConfigAlertRulesGet(alertFilters as GetAllAlertRulesApiV1ConfigAlertRulesGetParams);

  const refetchAlertRules = () => refetch();

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

  const openDeleteAlertRuleDialog = (alertRule: AlertRuleConfigSchema) => {
    setCurrentAlertRule(alertRule);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteAlertRuleDialog = () => {
    setIsDeleteDialogOpen(false);
    setTimeout(() => setCurrentAlertRule(null), 50);
  };

  return (
    <Box>
      <HeaderLayout>
        <MUIBaseButton
          sx={{ height: '40px' }}
          disableElevation
          startIcon={<WhitePlusIcon />}
          onClick={() => onDialogOpen()}
        >
          New Alert Rule
        </MUIBaseButton>
      </HeaderLayout>
      <StyledContainer>
        <FiltersSort alertFilters={alertFilters} setAlertFilters={setAlertFilters} isFilterByTimeLine={false} />
        <StyledAlertRulesContainer>
          {isAlertRulesLoading ? (
            <Loader />
          ) : alertRules.length !== 0 ? (
            alertRules.map(alertRule => (
              <AlertRuleConfigItem
                key={alertRule.id}
                onEdit={() => onDialogOpen(alertRule)}
                alertRule={alertRule}
                onDelete={() => openDeleteAlertRuleDialog(alertRule)}
              />
            ))
          ) : (
            <NoResults marginTop="184px" handleReset={() => resetAlertFilters(setAlertFilters)} />
          )}
        </StyledAlertRulesContainer>
      </StyledContainer>

      <AlertRuleDialogProvider>
        <AlertRuleDialog open={isDialogOpen} onClose={onDialogClose} alertRuleId={editableAlertRuleId} />
      </AlertRuleDialogProvider>

      <DeleteAlertRule
        alertRule={currentAlertRule}
        open={isDeleteDialogOpen}
        closeDialog={closeDeleteAlertRuleDialog}
        refetchAlertRules={refetchAlertRules}
      />
    </Box>
  );
};

const StyledContainer = styled(Box)({
  padding: '40px 0 ',
  width: '100%'
});

const StyledAlertRulesContainer = styled(Box)({
  padding: 0,
  marginTop: '40px',
  display: 'grid',
  'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px'
});

export default AlertRules;
