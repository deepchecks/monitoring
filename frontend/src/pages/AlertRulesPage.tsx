import React, { useState } from 'react';

import {
  AlertRuleConfigSchema,
  GetAlertRulesApiV1AlertRulesGetParams,
  GetAllAlertRulesApiV1ConfigAlertRulesGetParams,
  useGetAllAlertRulesApiV1ConfigAlertRulesGet
} from '../api/generated';

import { Box, styled } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import { AlertRuleConfigItem } from 'components/Alerts/AlertRuleConfig/AlertRuleConfigItem';
import { Loader } from 'components/base/Loader/Loader';
import { AlertRuleDialog } from 'components/Alerts/AlertRuleDialog/AlertRuleDialog';
import { AlertRuleDialogProvider } from 'components/Alerts/AlertRuleDialog/AlertRuleDialogContext';
import { DeleteAlertRule } from 'components/Alerts/AlertRuleConfig/components/DeleteAlertRule';
import { StyledButton, StyledText, StyledContainer } from 'components/lib';
import { FiltersSort } from 'components/FiltersSort/FiltersSort';
import NoResults from 'components/NoResults';

import { getAlertFilters, resetAlertFilters } from '../helpers/base/alertFilters';
import useOnboarding from 'helpers/hooks/useOnboarding';

export const AlertRulesPage = () => {
  const [isDataDialogOpen, setIsDataDialogOpen] = useState(false);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editableAlertRuleId, setEditableAlertRuleId] = useState<AlertRuleConfigSchema['id'] | undefined>();
  const [currentAlertRule, setCurrentAlertRule] = useState<AlertRuleConfigSchema | null>(null);
  const [alertFilters, setAlertFilters] = useState<GetAlertRulesApiV1AlertRulesGetParams>(
    getAlertFilters() as GetAlertRulesApiV1AlertRulesGetParams
  );

  const {
    data: alertRules = [],
    isLoading: isAlertRulesLoading,
    refetch
  } = useGetAllAlertRulesApiV1ConfigAlertRulesGet(alertFilters as GetAllAlertRulesApiV1ConfigAlertRulesGetParams);

  const refetchAlertRules = () => refetch();

  const onDialogClose = (isRefetch = false) => {
    isRefetch && refetchAlertRules();
    setIsModelDialogOpen(false);
    setIsDataDialogOpen(false);
    setEditableAlertRuleId(undefined);
  };

  const onDialogOpen = ({ alertRule, isDataAlert }: { alertRule?: AlertRuleConfigSchema; isDataAlert?: boolean }) => {
    setEditableAlertRuleId(alertRule?.id);

    if (isDataAlert) {
      setIsDataDialogOpen(true);
    } else {
      setIsModelDialogOpen(true);
    }
  };

  const openDeleteAlertRuleDialog = (alertRule: AlertRuleConfigSchema) => {
    setCurrentAlertRule(alertRule);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteAlertRuleDialog = () => {
    setIsDeleteDialogOpen(false);
    setTimeout(() => setCurrentAlertRule(null), 50);
  };

  useOnboarding();

  return (
    <Box margin="36px 0">
      <FiltersSort alertFilters={alertFilters} setAlertFilters={setAlertFilters} isFilterByTimeLine={false} />
      <StyledContainer display="flex" flexDirection="row" justifyContent="space-between" margin="16px 0">
        <StyledText text="Alert Rules" type="h1" />
        <StyledButton
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => onDialogOpen({ isDataAlert: false })}
          label="Rule"
        />
      </StyledContainer>
      <Box>
        {isAlertRulesLoading ? (
          <Loader sx={{ margin: '20vh auto' }} />
        ) : alertRules.length !== 0 ? (
          <StyledAlertRulesContainer>
            {alertRules.map(alertRule => (
              <AlertRuleConfigItem
                key={alertRule.id}
                onEdit={() => onDialogOpen({ alertRule: alertRule, isDataAlert: false })}
                alertRule={alertRule}
                onDelete={() => openDeleteAlertRuleDialog(alertRule)}
              />
            ))}
          </StyledAlertRulesContainer>
        ) : (
          <NoResults margin="20vh auto" handleReset={() => resetAlertFilters(setAlertFilters)} />
        )}
      </Box>
      <AlertRuleDialogProvider>
        <AlertRuleDialog
          open={isDataDialogOpen || isModelDialogOpen}
          onClose={onDialogClose}
          alertRuleId={editableAlertRuleId}
          isDataAlert={isDataDialogOpen}
        />
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

const StyledAlertRulesContainer = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '20px',
  padding: 0
});

export default AlertRulesPage;
