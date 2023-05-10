import React, { useState, useEffect, useCallback, useMemo } from 'react';

import {
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useUpdateMonitorApiV1MonitorsMonitorIdPut,
  MonitorOptions,
  getAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet,
  MonitorCheckConfSchema,
  Frequency
} from 'api/generated';

import useModels from 'helpers/hooks/useModels';

import { TextField, Stack, MenuItem, OutlinedInput, Typography } from '@mui/material';

import { MarkedSelect } from 'components/MarkedSelect';
import {
  ControlledMarkedSelect,
  ControlledMarkedSelectDisabledCallback
} from 'components/MarkedSelect/ControlledMarkedSelect';
import { SelectCheck as Check } from 'components/Select/SelectCheck';
import { SelectColumn as Column } from 'components/Select/SelectColumn';
import { TooltipInputWrapper } from 'components/TooltipInputWrapper';
import { Subcategory } from 'components/Subcategory';
import { ActiveAlertsModal } from '../ActiveAlertsModal';
import { StyledButton } from 'components/lib';

import { StyledDivider, StyledLink, StyledFormContainer } from './MonitorForm.style';

import { freqTimeWindow, lookbackTimeWindow, buildFilters } from 'helpers/monitorFields.helpers';
import { SelectValues } from 'helpers/types';
import { timeValues } from 'helpers/time';
import { unionCheckConf, FilteredValues } from 'helpers/utils/checkUtil';
import { events, reportEvent } from 'helpers/services/mixPanel';
import { FrequencyMap, FrequencyNumberMap, FrequencyNumberType } from 'helpers/utils/frequency';

import { InitialState, MonitorFormProps } from './MonitorForm.types';

export const MonitorForm = ({
  monitor,
  setMonitorToRefreshId,
  runCheckLookBack,
  handleCloseDrawer,
  isDrawerOpen,
  refetchMonitors,
  setGraphFrequency,
  selectedModelId,
  reset,
  setReset,
  ...props
}: MonitorFormProps) => {
  const [initialState, setInitialState] = useState<InitialState | null>(null);

  const [frequency, setFrequency] = useState<SelectValues>(
    FrequencyMap[monitor?.frequency as Frequency] ?? freqTimeWindow[0].value
  );

  useEffect(() => {
    setGraphFrequency(frequency);
  }, [frequency, setGraphFrequency]);

  const [isValidConfig, setIsValidConfig] = useState(true);
  const [error, setError] = useState(false);
  const [monitorName, setMonitorName] = useState(monitor?.name || '');
  const [model, setModel] = useState<SelectValues>(monitor?.check.model_id || selectedModelId || '');

  const [advanced, setAdvanced] = useState(false);

  const [check, setCheck] = useState<SelectValues>(monitor?.check.id || '');

  const [filteredValues, setFilteredValues] = useState<FilteredValues>(
    unionCheckConf(monitor?.check?.config?.params, monitor?.additional_kwargs?.check_conf)
  );
  const [resConf, setResConf] = useState<string | undefined>(monitor?.additional_kwargs?.res_conf?.[0]);

  const [aggregationWindow, setAggregationWindow] = useState<number>(monitor?.aggregation_window ?? 1);
  const [lookBack, setLookBack] = useState<SelectValues>(monitor?.lookback || timeValues.month);

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

  const { models: modelsList, getCurrentModel } = useModels();
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
      reportEvent(events.dashboardPage.savedSuccessfully, { 'Monitor name': data.name });
    }

    handleCloseDrawer();
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

  const handleActiveAlertResolve = () => {
    saveMonitor();
    setActiveAlertsModalOpen(false);
  };

  const clearLookBack = useCallback(() => {
    setLookBack('');
  }, []);

  const resetForm = () => {
    setCheck('');
    setColumn('');
  };

  const isDisabledLookback = useCallback(
    (lookbackSelect: { label: string; value: number }) => {
      if (frequency === undefined) return false;
      if (lookbackSelect.value < +frequency) return true;
      if (lookbackSelect.value > +frequency * 31) return true;
      return false;
    },
    [frequency]
  );

  useEffect(() => {
    const filteredLookbacks = lookbackTimeWindow.filter(val => !isDisabledLookback(val)).map(val => val.value);
    if (lookBack && !filteredLookbacks.includes(+lookBack)) {
      setLookBack(filteredLookbacks.at(-1));
    }
  }, [frequency]);

  useEffect(() => {
    if (isDrawerOpen) {
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
    isDrawerOpen,
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

  const aggregationWindowErr = aggregationWindow > 30;
  const aggregationWindowSuffix = `${FrequencyNumberMap[frequency as FrequencyNumberType['type']].toLowerCase()}${
    aggregationWindow > 1 ? 's' : ''
  }`;

  return (
    <Stack width={{ xs: '200px', xl: '360px' }} {...props}>
      <StyledFormContainer spacing="30px">
        <TextField
          sx={{ marginTop: '10px' }}
          label="Monitor name"
          size="small"
          value={monitorName}
          onChange={event => setMonitorName(event.target.value)}
          required={!monitor}
          error={error && !monitorName}
        />
        <MarkedSelect
          label="Model"
          value={model}
          onChange={event => {
            setModel(event.target.value as string);
            resetForm();
          }}
          clearValue={() => {
            setModel('');
            resetForm();
          }}
          disabled={!!monitor}
        >
          {modelsList.map(({ name, id }) => (
            <MenuItem key={id} value={id}>
              {name}
            </MenuItem>
          ))}
        </MarkedSelect>
        <Check
          monitor={monitor}
          model={model}
          check={check}
          setCheck={setCheck}
          filteredValues={filteredValues}
          setFilteredValues={setFilteredValues}
          resConf={resConf}
          setResConf={setResConf}
          setIsValidConfig={setIsValidConfig}
          disabled={!!monitor || !model}
          error={error}
        />
        <StyledDivider />
        <Column
          model={model}
          column={column}
          setColumn={setColumn}
          category={category}
          setCategory={setCategory}
          numericValue={numericValue}
          setNumericValue={setNumericValue}
        />
        <StyledDivider />
        <TooltipInputWrapper title="The frequency of sampling the monitor data">
          <MarkedSelect
            label="Frequency"
            value={frequency}
            required
            error={error && !frequency}
            onChange={event => setFrequency(event.target.value as string)}
            clearValue={() => {
              setFrequency(freqTimeWindow[0].value);
              setAggregationWindow(1);
            }}
            fullWidth
          >
            {freqTimeWindow.map(({ label, value }, index) => (
              <MenuItem key={value + index} value={value}>
                {label}
              </MenuItem>
            ))}
          </MarkedSelect>
        </TooltipInputWrapper>
        {!advanced ? (
          <StyledLink
            underline="hover"
            sx={{ display: 'flex' }}
            onClick={() => {
              setAdvanced(true);
            }}
          >
            Advanced
          </StyledLink>
        ) : (
          <Subcategory sx={{ marginTop: '0 !important' }}>
            <Typography sx={{ color: 'gray' }}>Aggregation value</Typography>
            <OutlinedInput
              placeholder="Aggregation window"
              size="small"
              value={aggregationWindow}
              onChange={event => setAggregationWindow(Number(event.target.value))}
              error={aggregationWindowErr}
              endAdornment={aggregationWindowSuffix}
              inputProps={{ min: 0, max: 30 }}
              type="number"
              fullWidth
              required
            />
            {aggregationWindowErr && <Typography color={'red'}>aggregation window max value is 30</Typography>}
            <StyledLink
              underline="hover"
              sx={{ display: 'flex' }}
              onClick={() => {
                setAdvanced(false);
                setAggregationWindow(1);
              }}
            >
              Reset to default
            </StyledLink>
          </Subcategory>
        )}
        <TooltipInputWrapper title="The range of viewing the monitor: e.g. from <date> to <date>">
          <ControlledMarkedSelect
            label="Display range"
            values={lookbackTimeWindow}
            value={lookBack}
            setValue={setLookBack}
            clearValue={clearLookBack}
            DisabledCallback={isDisabledLookback as ControlledMarkedSelectDisabledCallback}
            required
            error={error && !lookBack}
            fullWidth
          />
        </TooltipInputWrapper>
      </StyledFormContainer>
      <span onMouseEnter={() => setError(true)} onMouseLeave={() => setError(false)} style={{ margin: 'auto' }}>
        <StyledButton
          label="Save"
          onClick={handleMonitorSave}
          disabled={!monitorName || !check || !frequency || !aggregationWindow || !lookBack || !isValidConfig}
          color="primary"
          sx={{ margin: 'auto auto 20px auto', width: '200px' }}
        />
      </span>
      <ActiveAlertsModal
        open={activeAlertsModalOpen}
        setActiveAlertsModalOpen={setActiveAlertsModalOpen}
        handleActiveAlertResolve={handleActiveAlertResolve}
      />
    </Stack>
  );
};
