import React, { forwardRef, useEffect, useMemo, useState } from 'react';
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
import { CloseIcon, ExpandIcon, LockIcon, OpenLockIcon } from '../assets/icon/icon';
import { TransitionProps } from '@mui/material/transitions';
import {
  AlertRuleConfigSchema,
  AlertRuleSchema,
  MonitorSchema,
  OperatorsEnum,
  useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useGetAlertRuleApiV1AlertRulesAlertRuleIdGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  useUpdateAlertApiV1AlertRulesAlertRuleIdPut,
  useUpdateMonitorApiV1MonitorsMonitorIdPut
} from '../api/generated';
import { Loader } from './Loader';
import useModels from '../hooks/useModels';
import deepmerge from 'deepmerge';
import { DeepPartial } from 'utility-types';
import { AlertRuleDialogStep1, AlertRuleDialogStep1Values } from './AlertRuleDialogStep1';
import { AlertRuleDialogStep2, AlertRuleDialogStep2Values } from './AlertRuleDialogStep2';
import { AlertRuleDialogStep3, AlertRuleDialogStep3Values } from './AlertRuleDialogStep3';
import { AlertRuleDialogStep4, AlertRuleDialogStep4Values } from './AlertRuleDialogStep4';
import { omit } from 'lodash';

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

const STEP_KEY_SAVING = 0;

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const initialAlertRule = {
  name: '',
  alert_severity: undefined,
  condition: {
    operator: OperatorsEnum.greater_than_equals,
    value: 0
  },
  repeat_every: 0
} as AlertRuleSchema;

const initialMonitor = {
  name: '',
  lookback: 0,
  check: {
    id: 0,
    model_id: 0
  },
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
      const { id: monitorId, check, ...monitor } = editMonitor;
      await Promise.all([
        updateMonitor({ monitorId, data: monitor }),
        updateAlertRule({ alertRuleId, data: editAlertRule })
      ]);
    } else {
      const { check, ...monitor } = editMonitor;
      const { id: monitorId } = await createMonitor({ checkId: check.id, data: monitor });
      await createAlertRule({ monitorId, data: editAlertRule });
    }

    handleClose(true);
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
              name: editAlertRule?.name,
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
        title: 'Model Details',
        isExpendable: true,
        Component: () => (
          <AlertRuleDialogStep2
            isEdit={isEdit}
            models={models}
            initialValues={{
              model_id: editMonitor?.check.model_id,
              check_id: editMonitor?.check.id,
              lookback: editMonitor?.lookback
            }}
            onSubmit={onStepComplete<AlertRuleDialogStep2Values>(2, values => {
              setEditMonitor(prevMonitor => {
                const isModelIdChanged = prevMonitor.check.model_id !== values.model_id;
                return deepmerge<MonitorSchema, DeepPartial<MonitorSchema>>(prevMonitor, {
                  lookback: values.lookback,
                  check: {
                    id: values.check_id,
                    model_id: values.model_id
                  },
                  data_filters: isModelIdChanged ? undefined : prevMonitor.data_filters
                });
              });
            })}
          />
        )
      },
      {
        key: 3,
        title: 'Filter By Segment',
        isExpendable: !!editMonitor?.check.model_id,
        Component: () => (
          <AlertRuleDialogStep3
            isEdit={isEdit}
            modelId={editMonitor?.check.model_id || 0}
            initialValues={(editMonitor.data_filters || initialMonitor.data_filters!).filters[0]}
            onSubmit={onStepComplete<AlertRuleDialogStep3Values>(3, values => {
              setEditMonitor(prevMonitor =>
                deepmerge<MonitorSchema, DeepPartial<MonitorSchema>>(
                  prevMonitor,
                  {
                    data_filters: {
                      filters: [values]
                    }
                  },
                  { arrayMerge: (destinationArray, sourceArray) => sourceArray }
                )
              );
            })}
          />
        )
      },
      {
        key: 4,
        title: 'Monitor Logic',
        isExpendable: true,
        Component: () => (
          <AlertRuleDialogStep4
            isEdit={isEdit}
            monitor={editMonitor}
            buttonProps={{ startIcon: null, children: 'Save Alert Rule' }}
            initialValues={{
              ...(editAlertRule.condition || initialAlertRule.condition),
              repeat_every: editAlertRule?.repeat_every
            }}
            onSubmit={onStepComplete<AlertRuleDialogStep4Values>(4, values => {
              setEditAlertRule(prevAlertRule =>
                deepmerge<AlertRuleSchema, DeepPartial<AlertRuleSchema>>(prevAlertRule, {
                  repeat_every: values.repeat_every,
                  condition: omit(values, 'repeat_every')
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

  const handleClose = (isRefetch = false) => {
    onClose(isRefetch);
    setCurrentStepKey(steps[INITIAL_STEP_INDEX].key);
    setEditMonitor(initialMonitor);
    setEditAlertRule(initialAlertRule);
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

    return (
      <Accordion
        key={key}
        expanded={isCurrentStep}
        onChange={() => isExpendable && setCurrentStepKey(key)}
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
