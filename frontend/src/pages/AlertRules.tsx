import React, { useContext, useEffect, useState } from 'react';
import { Button, Box, useTheme } from '@mui/material';
import { AlertRuleConfigItem } from 'components/AlertRuleConfig/AlertRuleConfigItem';
import { Loader } from 'components/Loader';
import { AlertRuleDialog } from '../components/AlertRuleDialog';
import { AlertsFilters } from 'components/AlertsFilters';
import {
  AlertRuleConfigSchema,
  GetAllAlertRulesApiV1ConfigAlertRulesGetParams,
  useDeleteAlertRuleApiV1AlertRulesAlertRuleIdDelete,
  useGetAllAlertRulesApiV1ConfigAlertRulesGet
} from '../api/generated';
import { WhitePlusIcon } from 'assets/icon/icon';
import useHeader from 'hooks/useHeader';
import { GlobalStateContext } from '../Context';

export const AlertRules = () => {
  const { Header, setChildren } = useHeader();
  const theme = useTheme();
  const { alertFilters: filters } = useContext(GlobalStateContext);

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
    setIsDialogOpen(true);
    setEditableAlertRuleId(alertRule?.id);
  };

  const onAlertRuleDelete = async (alertRule: AlertRuleConfigSchema) => {
    await deleteAlertRuleById({ alertRuleId: alertRule.id });
    refetchAlertRules();
  };

  useEffect(() => {
    setChildren(
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
    );

    return () => {
      setChildren(null);
    };
  }, []);

  const isLoading = isAlertRulesLoading || isDeleteAlertRuleLoading;

  return (
    <Box>
      <Header />
      <Box
        sx={{
          padding: '40px 0 ',
          width: '100%',
          [theme.breakpoints.down(1381)]: {
            marginLeft: '83px'
          }
        }}
      >
        <AlertsFilters isFilterByTimeLine={false} />
        <Box
          sx={{
            padding: 0,
            marginTop: '40px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          {isLoading ? (
            <Loader />
          ) : (
            alertRules.map(alertRule => (
              <AlertRuleConfigItem
                key={alertRule.id}
                onEdit={() => onDialogOpen(alertRule)}
                alertRule={alertRule}
                onDelete={() => onAlertRuleDelete(alertRule)}
              />
            ))
          )}
        </Box>
      </Box>

      <AlertRuleDialog open={isDialogOpen} onClose={onDialogClose} alertRuleId={editableAlertRuleId} />
    </Box>
  );
};
