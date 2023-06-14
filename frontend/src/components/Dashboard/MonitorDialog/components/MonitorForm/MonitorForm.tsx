import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';

import {
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useUpdateMonitorApiV1MonitorsMonitorIdPut,
  MonitorOptions,
  getAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet,
  MonitorCheckConfSchema,
  Frequency
} from 'api/generated';

import useModels from 'helpers/hooks/useModels';

import { Stack } from '@mui/material';

import { MonitorFormSteps } from './components/MonitorFormSteps';
import { MonitorFormStepOne } from './components/MonitorFormStepOne';
import { MonitorFormStepTwo } from './components/MonitorFormStepTwo';
import { ActiveAlertsModal } from '../ActiveAlertsModal';

import { freqTimeWindow, buildFilters } from 'helpers/base/monitorFields.helpers';
import { SelectValues } from 'helpers/types';
import { getLookBack } from './MonitorForm.helpers';
import { unionCheckConf, FilteredValues } from 'helpers/utils/checkUtil';
import { FrequencyMap, FrequencyNumberMap, FrequencyNumberType } from 'helpers/utils/frequency';
import { InitialState, MonitorFormProps } from './MonitorForm.types';

export const MonitorForm = forwardRef(
  (
    {
      activeStep,
      monitor,
      setMonitorToRefreshId,
      runCheckLookBack,
      handleCloseDialog,
      isDialogOpen,
      refetchMonitors,
      setGraphFrequency,
      selectedModelId,
      reset,
      setReset,
      setSubmitButtonDisabled,
      ...otherProps
    }: MonitorFormProps,
    ref
  ) => {
    const [initialState, setInitialState] = useState<InitialState | null>(null);

    const [frequency, setFrequency] = useState<SelectValues>(
      FrequencyMap[monitor?.frequency as Frequency] ?? freqTimeWindow[0].value
    );
    const [lookBack, setLookBack] = useState<SelectValues>(monitor?.lookback || getLookBack(frequency));

    useEffect(() => {
      setGraphFrequency(frequency);
      setLookBack(getLookBack(frequency));
    }, [frequency, setGraphFrequency]);

    const [isValidConfig, setIsValidConfig] = useState(true);
    const [monitorName, setMonitorName] = useState(monitor?.name || '');
    const [model, setModel] = useState<SelectValues>(monitor?.check.model_id || selectedModelId || '');

    const [check, setCheck] = useState<SelectValues>(monitor?.check.id || '');

    const [filteredValues, setFilteredValues] = useState<FilteredValues>(
      unionCheckConf(monitor?.check?.config?.params, monitor?.additional_kwargs?.check_conf)
    );
    const [resConf, setResConf] = useState<string | undefined>(monitor?.additional_kwargs?.res_conf?.[0]);

    const [aggregationWindow, setAggregationWindow] = useState<number>(monitor?.aggregation_window ?? 1);

    const [column, setColumn] = useState<string | undefined>(monitor?.data_filters?.filters?.[0]?.column || '');
    const [category, setCategory] = useState<SelectValues>(() => {
      const filters = monitor?.data_filters?.filters;
      if (filters?.length) {
        return filters.length > 1 ? undefined : (filters[0].value as string);
      }
    });
    const [numericValue, setNumericValue] = useState<number[] | undefined>(() => {
      const filters = monitor?.data_filters?.filters;
      if (filters?.length) {
        return filters.length > 1 ? [filters[0].value as number, filters[1].value as number] : undefined;
      }
    });

    const [activeAlertsModalOpen, setActiveAlertsModalOpen] = useState(false);

    useEffect(() => {
      if (monitor) {
        setInitialState({
          frequency,
          monitorName,
          model,
          check,
          filteredValues,
          resConf,
          aggregationWindow,
          lookBack,
          column,
          category,
          numericValue
        });
      }
    }, []);

    const resetChanges = () => {
      if (initialState) {
        setFrequency(initialState.frequency);
        setMonitorName(initialState.monitorName);
        setModel(initialState.model);
        setCheck(initialState.check);
        setFilteredValues(initialState.filteredValues);
        setResConf(initialState.resConf);
        setAggregationWindow(initialState.aggregationWindow);
        setLookBack(initialState.lookBack);
        setColumn(initialState.column);
        setCategory(initialState.category);
        setNumericValue(initialState.numericValue);
      }
    };

    useEffect(() => {
      if (reset) {
        resetChanges();
        setReset(false);
      }
    }, [reset]);

    const { getCurrentModel } = useModels();
    const currentModel = useMemo(
      () => (typeof model === 'number' ? getCurrentModel(model) : null),
      [getCurrentModel, model]
    );

    const { mutateAsync: createMonitor } = useCreateMonitorApiV1ChecksCheckIdMonitorsPost();
    const { mutateAsync: updateMonitor } = useUpdateMonitorApiV1MonitorsMonitorIdPut();

    const additionalKwargs = useMemo(() => {
      if (Object.keys(filteredValues).length) {
        const additionalKwargs = {
          check_conf: filteredValues,
          res_conf: resConf ? [resConf] : undefined
        };

        return additionalKwargs;
      }
    }, [filteredValues, resConf]);

    useEffect(() => {
      if (frequency && !aggregationWindow) {
        setAggregationWindow(1);
      }

      if (aggregationWindow && !frequency) {
        setFrequency(freqTimeWindow[0].value);
      }
    }, [aggregationWindow, frequency]);

    const saveMonitor = async () => {
      if (lookBack && aggregationWindow && frequency) {
        const data = {
          name: monitorName,
          lookback: +lookBack,
          aggregation_window: +aggregationWindow,
          frequency: FrequencyNumberMap[+frequency as FrequencyNumberType['type']],
          dashboard_id: 1,
          additional_kwargs: additionalKwargs as MonitorCheckConfSchema,
          data_filters: buildFilters(column, category, numericValue)
        };

        if (monitor) {
          await updateMonitor({
            monitorId: monitor.id,
            data
          });
          setMonitorToRefreshId(monitor.id);
        } else if (typeof check === 'number') {
          await createMonitor({
            checkId: check,
            data
          });
        }

        refetchMonitors();
      }

      handleCloseDialog();
    };

    const handleMonitorSave = async () => {
      if (monitor) {
        let hasActiveAlerts = false;

        for (const alertRule of monitor.alert_rules) {
          const alerts = await getAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet(alertRule.id);
          const nonResolved = alerts.some(a => !a.resolved);

          if (nonResolved) {
            hasActiveAlerts = true;
            setActiveAlertsModalOpen(true);
            break;
          }
        }

        if (hasActiveAlerts) return;
      }

      saveMonitor();
    };

    useImperativeHandle(ref, () => ({
      submit() {
        handleMonitorSave();
      }
    }));

    const handleActiveAlertResolve = () => {
      saveMonitor();
      setActiveAlertsModalOpen(false);
    };

    const resetForm = () => {
      setCheck('');
      setColumn('');
    };

    useEffect(() => {
      if (isDialogOpen) {
        if (currentModel && lookBack && frequency && aggregationWindow) {
          const endTime = currentModel.latest_time ? new Date(currentModel.latest_time * 1000) : new Date();
          const data: MonitorOptions = {
            start_time: new Date(endTime.getTime() - +lookBack * 1000).toISOString(),
            end_time: endTime.toISOString(),
            additional_kwargs: (additionalKwargs as MonitorCheckConfSchema) || undefined,
            frequency: FrequencyNumberMap[+frequency as FrequencyNumberType['type']],
            aggregation_window: +aggregationWindow,
            filter: buildFilters(column, category, numericValue) || undefined
          };
          runCheckLookBack(check, data);
        }
      }
    }, [
      isDialogOpen,
      aggregationWindow,
      category,
      check,
      column,
      currentModel,
      frequency,
      additionalKwargs,
      lookBack,
      numericValue,
      runCheckLookBack
    ]);

    useEffect(() => {
      setSubmitButtonDisabled(
        activeStep === 0
          ? !monitorName || !model
          : !check || !frequency || !aggregationWindow || !lookBack || !isValidConfig
      );
    }, [activeStep, monitorName, model, check, frequency, aggregationWindow, lookBack, isValidConfig]);

    return (
      <Stack spacing="30px" marginBottom={activeStep === 0 ? '30px' : '20px'} {...otherProps}>
        <MonitorFormSteps activeStep={activeStep} />
        {activeStep === 0 ? (
          <MonitorFormStepOne
            monitorName={monitorName}
            setMonitorName={setMonitorName}
            monitor={monitor}
            model={model}
            setModel={setModel}
            resetForm={resetForm}
          />
        ) : (
          <MonitorFormStepTwo
            monitor={monitor}
            model={model}
            check={check}
            setCheck={setCheck}
            filteredValues={filteredValues}
            setFilteredValues={setFilteredValues}
            resConf={resConf}
            setResConf={setResConf}
            setIsValidConfig={setIsValidConfig}
            column={column}
            setColumn={setColumn}
            category={category}
            setCategory={setCategory}
            numericValue={numericValue}
            setNumericValue={setNumericValue}
            frequency={frequency}
            setFrequency={setFrequency}
            aggregationWindow={aggregationWindow}
            setAggregationWindow={setAggregationWindow}
          />
        )}
        <ActiveAlertsModal
          open={activeAlertsModalOpen}
          setActiveAlertsModalOpen={setActiveAlertsModalOpen}
          handleActiveAlertResolve={handleActiveAlertResolve}
        />
      </Stack>
    );
  }
);

MonitorForm.displayName = 'MonitorForm';
