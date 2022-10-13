import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import deepmerge from 'deepmerge';
import mixpanel from 'mixpanel-browser';

import useModels from '../hooks/useModels';

import {
  AlertRuleConfigSchema,
  AlertRuleSchema,
  DataFilterList,
  MonitorSchema,
  OperatorsEnum,
  useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useGetAlertRuleApiV1AlertRulesAlertRuleIdGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  useUpdateAlertApiV1AlertRulesAlertRuleIdPut,
  useUpdateMonitorApiV1MonitorsMonitorIdPut
} from '../api/generated';

import {
  DialogProps,
  Dialog,
  AppBar,
  IconButton,
  Typography,
  Toolbar,
  Slide,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  useTheme
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';

import { Loader } from './Loader';
import { AlertRuleDialogStep1, AlertRuleDialogStep1Values } from './AlertRuleDialogStep1';
import { AlertRuleDialogStep2, AlertRuleDialogStep2Values } from './AlertRuleDialogStep2';
import { AlertRuleDialogStep3, AlertRuleDialogStep3Values } from './AlertRuleDialogStep3';

import { CloseIcon, ExpandIcon, LockIcon, OpenLockIcon } from '../assets/icon/icon';

import { DeepPartial } from 'utility-types';

interface AlertRuleDialogProps extends Omit<DialogProps, 'onClose'> {
  alertRuleId?: AlertRuleConfigSchema['id'];
  onClose: (isRefetch?: boolean) => void;
}

interface AlertRuleDialogStep {
  key: number;
  title: string;
  isExpendable: boolean;
  Component: () => JSX.Element;
}

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type trackAddEditRuleSavedSuccessfullyData = PartialBy<MonitorSchema, 'id' | 'check'>;

const trackAddEditRuleSavedSuccessfully = (data: trackAddEditRuleSavedSuccessfullyData) =>
  mixpanel.track('Add/Edit alert rule saved successfully', { 'The rule details': data });

const trackNavigationBetweenStages = () => mixpanel.track('Navigation between stages in the form');

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const initialAlertRule = {
  alert_severity: undefined,
  condition: {
    operator: OperatorsEnum.greater_than_equals,
    value: 0
  }
} as AlertRuleSchema;

const initialMonitor = {
  name: '',
  lookback: 0,
  check: {
    id: 0,
    model_id: 0
  },
  frequency: 86400,
  aggregation_window: 86400,
  data_filters: {
    filters: [
      {
        column: '',
        operator: OperatorsEnum.greater_than_equals,
        value: ''
      }
    ]
  }
} as MonitorSchema;

const INITIAL_STEP_INDEX = 0;
const STEP_KEY_SAVING = 0;

export const AlertRuleDialog = ({ alertRuleId = 0, onClose, ...props }: AlertRuleDialogProps) => {
  const theme = useTheme();
  const isEdit = !!alertRuleId;

  const { models, isLoading: isModelsLoading } = useModels();
  const { data: alertRule, isLoading: isAlertRuleLoading } = useGetAlertRuleApiV1AlertRulesAlertRuleIdGet(alertRuleId);
  const { data: monitor, isLoading: isMonitorLoading } = useGetMonitorApiV1MonitorsMonitorIdGet(
    alertRule?.monitor_id || 0
  );

  const { mutateAsync: createMonitor, isLoading: isCreateMonitorLoading } =
    useCreateMonitorApiV1ChecksCheckIdMonitorsPost();
  const { mutateAsync: createAlertRule, isLoading: isCreateAlertRuleLoading } =
    useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost();

  const { mutateAsync: updateMonitor, isLoading: isUpdateMonitorLoading } = useUpdateMonitorApiV1MonitorsMonitorIdPut();
  const { mutateAsync: updateAlertRule, isLoading: isUpdateAlertRuleLoading } =
    useUpdateAlertApiV1AlertRulesAlertRuleIdPut();

  const [editMonitor, setEditMonitor] = useState<MonitorSchema>(initialMonitor);
  const [editAlertRule, setEditAlertRule] = useState<AlertRuleSchema>(initialAlertRule);

  const onSaveAndClose = async () => {
    if (isEdit) {
      const { id: monitorId, ...monitor } = editMonitor;

      await Promise.all([
        updateMonitor({ monitorId, data: monitor }),
        updateAlertRule({ alertRuleId, data: editAlertRule })
      ]);

      trackAddEditRuleSavedSuccessfully(monitor);
    } else {
      const { check, ...monitor } = editMonitor;
      const { id: monitorId } = await createMonitor({ checkId: check.id, data: monitor });

      await createAlertRule({ monitorId, data: editAlertRule });

      trackAddEditRuleSavedSuccessfully(monitor);
    }

    handleClose(true, true);
  };

  const onStepComplete =
    <T extends Record<string, any>>(
      completeStepKey: AlertRuleDialogStep['key'],
      onStepSubmitHandler: (values: T) => void
    ) =>
    (values: T) => {
      onStepSubmitHandler(values);

      const completeStepIndex = steps.findIndex(({ key }) => key === completeStepKey);
      const isLastStep = completeStepIndex >= steps.length - 1;

      setCurrentStepKey(isLastStep ? STEP_KEY_SAVING : steps[completeStepIndex + 1].key);

      !isLastStep && trackNavigationBetweenStages();
    };

  const steps: AlertRuleDialogStep[] = useMemo(
    () => [
      {
        key: 1,
        title: 'Basic Details',
        isExpendable: true,
        Component: () => (
          <AlertRuleDialogStep1
            isEdit={isEdit}
            initialValues={{
              name: editMonitor?.name,
              alert_severity: editAlertRule?.alert_severity
            }}
            onSubmit={onStepComplete<AlertRuleDialogStep1Values>(1, values => {
              setEditAlertRule(prevAlertRule =>
                deepmerge<AlertRuleSchema, DeepPartial<AlertRuleSchema>>(prevAlertRule, values)
              );
              setEditMonitor(prevMonitor =>
                deepmerge<MonitorSchema, DeepPartial<MonitorSchema>>(prevMonitor, { name: values.name })
              );
            })}
          />
        )
      },
      {
        key: 2,
        title: 'Monitor Data',
        isExpendable: true,
        Component: () => (
          <AlertRuleDialogStep2
            isEdit={isEdit}
            models={models}
            initialValues={{
              model_id: editMonitor?.check.model_id,
              check_id: editMonitor?.check.id,
              data_filter: (editMonitor.data_filters || initialMonitor.data_filters!).filters[0],
              aggregation_window: editMonitor?.aggregation_window,
              frequency: editMonitor?.frequency
            }}
            onSubmit={onStepComplete<AlertRuleDialogStep2Values>(2, values => {
              setEditMonitor(prevMonitor => {
                const isModelIdChanged = prevMonitor.check.model_id !== values.model_id;
                return deepmerge<MonitorSchema, DeepPartial<MonitorSchema>>(prevMonitor, {
                  check: {
                    id: values.check_id,
                    model_id: values.model_id
                  },
                  data_filters:
                    isModelIdChanged || !values.data_filter
                      ? undefined
                      : deepmerge<DataFilterList | undefined, DeepPartial<DataFilterList>>(prevMonitor.data_filters, {
                          filters: [values.data_filter]
                        }),
                  frequency: values.frequency,
                  aggregation_window: values.aggregation_window,
                  lookback: dayjs.duration(1, 'months').milliseconds()
                });
              });
            })}
          />
        )
      },
      {
        key: 3,
        title: 'Alert Logic',
        isExpendable: !!editMonitor?.check.model_id,
        Component: () => (
          <AlertRuleDialogStep3
            isEdit={isEdit}
            monitor={editMonitor}
            buttonProps={{ startIcon: null, children: 'Save Alert Rule' }}
            initialValues={{
              ...(editAlertRule.condition || initialAlertRule.condition)
            }}
            onSubmit={onStepComplete<AlertRuleDialogStep3Values>(3, values => {
              setEditAlertRule(prevAlertRule =>
                deepmerge<AlertRuleSchema, DeepPartial<AlertRuleSchema>>(prevAlertRule, {
                  condition: values
                })
              );
            })}
          />
        )
      }
    ],
    [editAlertRule, editMonitor]
  );

  const [currentStepKey, setCurrentStepKey] = useState<AlertRuleDialogStep['key']>(steps[INITIAL_STEP_INDEX].key);

  useEffect(() => {
    if (currentStepKey !== STEP_KEY_SAVING) return;
    onSaveAndClose();
  }, [currentStepKey]);

  useEffect(() => {
    setEditAlertRule(isEdit && alertRule ? alertRule : (initialAlertRule as AlertRuleSchema));
    setEditMonitor(isEdit && monitor ? monitor : (initialMonitor as MonitorSchema));
  }, [isEdit, alertRule, monitor]);

  const handleClose = (isRefetch = false, finished = false) => {
    onClose(isRefetch);
    setCurrentStepKey(steps[INITIAL_STEP_INDEX].key);
    setEditMonitor(initialMonitor);
    setEditAlertRule(initialAlertRule);

    !finished && mixpanel.track('Add/Edit alert rule exited without saving');
  };

  const isLoading =
    (isEdit && (isAlertRuleLoading || isMonitorLoading)) ||
    isModelsLoading ||
    isCreateMonitorLoading ||
    isCreateAlertRuleLoading ||
    isUpdateMonitorLoading ||
    isUpdateAlertRuleLoading;

  const renderStep = ({ key, title, isExpendable, Component }: AlertRuleDialogStep) => {
    const isCurrentStep = key === currentStepKey;

    const handleAccordionChange = () => {
      if (!isCurrentStep && isExpendable) {
        setCurrentStepKey(key);
        trackNavigationBetweenStages();
      }
    };

    return (
      <Accordion
        key={key}
        expanded={isCurrentStep}
        onChange={handleAccordionChange}
        sx={{
          mb: '40px',
          boxShadow: '0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
          borderRadius: '10px',
          ':first-of-type, :last-of-type': {
            borderRadius: '10px'
          },
          '& .MuiAccordionDetails-root': {
            p: '0'
          },
          '&:before': {
            display: 'none'
          },
          '&.Mui-expanded': {
            '& .MuiAccordionSummary-root': {
              borderRadius: '10px 10px 0 0'
            },
            mb: '40px'
          }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandIcon fill={isCurrentStep ? theme.palette.common.white : theme.palette.grey[200]} />}
          aria-controls="panel1bh-content"
          id={`step-${key}-header`}
          sx={{
            backgroundColor: isCurrentStep ? '#17003E' : theme.palette.grey[100],
            color: isCurrentStep ? theme.palette.common.white : theme.palette.text.disabled,
            borderRadius: '10px',
            '& .MuiAccordionSummary-content': {
              m: '27px 0 28px'
            }
          }}
        >
          <Box
            sx={{
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isCurrentStep ? theme.palette.primary.light : theme.palette.common.white,
              mr: '30px',
              ml: '16px'
            }}
          >
            <Typography variant="h5" color={isCurrentStep ? theme.palette.primary.dark : theme.palette.text.disabled}>
              {key}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={600}>
              {title}
            </Typography>
          </Box>
          <Box
            sx={{
              mr: '30px',
              display: 'flex',
              alignItems: 'center',
              ...((isCurrentStep || isExpendable) && { color: isCurrentStep ? 'rgba(255, 255, 255, 0.4)' : '#5718B8' })
            }}
          >
            {isExpendable ? <OpenLockIcon /> : <LockIcon />}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Component />
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Dialog
      fullScreen
      TransitionComponent={Transition}
      onClose={() => handleClose()}
      {...props}
      sx={{ '& .MuiDialog-paper': { p: '0 40px' } }}
    >
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <AppBar
            sx={{
              position: 'relative',
              backgroundColor: 'inherit',
              boxShadow: 'unset',
              m: '28px auto 51px'
            }}
          >
            <Toolbar sx={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 'unset !important' }}>
              <Typography
                sx={{
                  m: '0 auto',
                  justifySelf: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: theme.palette.text.primary
                }}
                component="h1"
              >
                {alertRule ? `Edit Alert On: ${monitor?.name}` : 'Create New Alert'}
              </Typography>
              <IconButton
                sx={{
                  justifySelf: 'flex-end',
                  color: 'inherit',
                  mr: '-50px',
                  backgroundColor: 'inherit'
                }}
                onClick={() => handleClose()}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          {steps.map(renderStep)}
        </>
      )}
    </Dialog>
  );
};
