import React, { useState, useEffect, useCallback, useMemo } from 'react';
import mixpanel from 'mixpanel-browser';

import {
  MonitorSchema,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useUpdateMonitorApiV1MonitorsMonitorIdPut,
  MonitorOptions,
  getAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet,
  MonitorCheckConfSchema
} from 'api/generated';

import useModels from 'hooks/useModels';

import { TextField, StackProps, Stack, Button, MenuItem, styled, Divider, Link } from '@mui/material';

import { MarkedSelect } from 'components/MarkedSelect';
import { ControlledMarkedSelect } from 'components/MarkedSelect/ControlledMarkedSelect';
import { SelectCheck as Check } from '../../../../SelectCheck';
import { SelectColumn as Column } from '../../../../SelectColumn';
import { TooltipInputWrapper } from 'components/TooltipInputWrapper';

import { timeWindow, buildFilters } from '../../../../../helpers/monitorFields.helpers';
import { SelectValues, SetStateType } from 'helpers/types';
import { ActiveAlertsModal } from '../ActiveAlertsModal';
import { FilteredValues } from 'components/AnalysisItem/AnalysisItem.types';
import { Subcategory } from 'components/Subcategory';

interface MonitorFormProps extends StackProps {
  monitor: MonitorSchema | null;
  setMonitorToRefreshId: SetStateType<number | null>;
  runCheckLookBack: (checkId: SelectValues, data: MonitorOptions) => Promise<void>;
  handleCloseDrawer: () => void;
  isDrawerOpen: boolean;
  refetchMonitors(): void;
  frequency: SelectValues;
  setFrequency: SetStateType<SelectValues>;
}

export const MonitorForm = ({
  monitor,
  setMonitorToRefreshId,
  runCheckLookBack,
  handleCloseDrawer,
  isDrawerOpen,
  refetchMonitors,
  frequency,
  setFrequency,
  ...props
}: MonitorFormProps) => {
  const [monitorName, setMonitorName] = useState(monitor?.name || '');
  const [model, setModel] = useState<SelectValues>(monitor?.check.model_id || '');

  const [advanced, setAdvanced] = useState<boolean>(false);

  const [check, setCheck] = useState<SelectValues>(monitor?.check.id || '')

  const [filteredValues, setFilteredValues] = useState<FilteredValues>(monitor?.additional_kwargs?.check_conf as FilteredValues || {});
  const [resConf, setResConf] = useState<string | undefined>(monitor?.additional_kwargs?.res_conf?.[0]);

  const [aggregationWindow, setAggregationWindow] = useState<SelectValues>(monitor?.aggregation_window || '');
  const [lookBack, setLookBack] = useState<SelectValues>(monitor?.lookback || '');

  const [column, setColumn] = useState<string | undefined>(monitor?.data_filters?.filters?.[0]?.column || '');
  const [category, setCategory] = useState<SelectValues>(() => {
    const filters = monitor?.data_filters?.filters;
    if (filters?.length) {
      return filters.length > 1
        ? undefined
        : filters[0].value as string;
    }
  });
  const [numericValue, setNumericValue] = useState<number[] | undefined>(() => {
    const filters = monitor?.data_filters?.filters;
    if (filters?.length) {
      return filters.length > 1
        ? [filters[0].value as number, filters[1].value as number]
        : undefined;
    }
  });

  const [activeAlertsModalOpen, setActiveAlertsModalOpen] = useState(false);

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
      setAggregationWindow(frequency);
    }

    if ((aggregationWindow && frequency && frequency > aggregationWindow) || (!frequency && aggregationWindow)) {
      setFrequency(aggregationWindow);
    }
  }, [aggregationWindow, frequency]);

  const saveMonitor = async () => {
    if (lookBack && aggregationWindow && frequency) {
      const data = {
        name: monitorName,
        lookback: +lookBack,
        aggregation_window: +aggregationWindow,
        frequency: +frequency,
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
      mixpanel.track('Saved successfully', { 'The monitor details': data });
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

  const clearAggregationWindow = useCallback(() => {
    setAggregationWindow('');
    setFrequency('');
  }, []);

  const clearLookBack = useCallback(() => {
    setLookBack('');
  }, []);

  const resetForm = () => {
    setCheck('');
    setColumn('');
  };

  useEffect(() => {
    if (isDrawerOpen) {
      if (currentModel && lookBack && frequency && aggregationWindow) {
        const endTime = currentModel.latest_time ? new Date(currentModel.latest_time * 1000) : new Date();
        const data: MonitorOptions = {
          start_time: new Date(endTime.getTime() - +lookBack * 1000).toISOString(),
          end_time: endTime.toISOString(),
          additional_kwargs: additionalKwargs as MonitorCheckConfSchema || undefined,
          frequency: +frequency,
          aggregation_window: +aggregationWindow,
          filter: buildFilters(column, category, numericValue) || undefined
        };
        runCheckLookBack(check, data);
      }
    }
  },
    [isDrawerOpen,
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

  return (
    <Stack width={{ xs: '200px', xl: '360px' }} {...props}>
      <Stack spacing="30px" sx={{ height: 'calc(100% - 100px)', overflowY: 'auto', overflowX: 'hidden' }}>
        <TextField
          sx={{ marginTop: '10px' }}
          label="Monitor name"
          size="small"
          value={monitorName}
          onChange={event => setMonitorName(event.target.value)}
          required={!monitor}
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
          disabled={!!monitor || !model}
        />
        <StyledDivider />
        <Column
          monitor={monitor}
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
            onChange={event => {
              setFrequency(event.target.value as number)
              !advanced && setAggregationWindow(event.target.value as number)
            }
            }
            clearValue={() => {
              setFrequency('');
              setAggregationWindow('');
            }}
            fullWidth
          >
            {timeWindow.map(({ label, value }, index) => (
              <MenuItem
                key={value + index}
                value={value}
                disabled={advanced && typeof aggregationWindow === 'number' && value > aggregationWindow}
              >
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
            <TooltipInputWrapper title="The date range for calculating the monitor sample. e.g. sample every day and use the last 7 days to calculate the metric">
              <ControlledMarkedSelect
                label="Aggregation window"
                values={timeWindow}
                value={aggregationWindow}
                setValue={setAggregationWindow}
                clearValue={clearAggregationWindow}
                fullWidth
              />
            </TooltipInputWrapper>
            <StyledLink
              underline="hover"
              sx={{ display: 'flex' }}
              onClick={() => {
                setAdvanced(false);
              }}
            >
              Reset to default
            </StyledLink>
          </Subcategory>
        )}
        <TooltipInputWrapper title="The range of viewing the monitor: e.g. from <date> to <date>">
          <ControlledMarkedSelect
            label="Display range"
            values={timeWindow}
            value={lookBack}
            setValue={setLookBack}
            clearValue={clearLookBack}
            fullWidth
          />
        </TooltipInputWrapper>
      </Stack>
      <StyledButton
        onClick={handleMonitorSave}
        disabled={!monitorName || !check || !frequency || !aggregationWindow || !lookBack}
        sx={{ margin: 'auto auto 20px auto' }}
      >
        Save
      </StyledButton>
      <ActiveAlertsModal
        open={activeAlertsModalOpen}
        setActiveAlertsModalOpen={setActiveAlertsModalOpen}
        handleActiveAlertResolve={handleActiveAlertResolve}
      />
    </Stack>
  );
};

const StyledButton = styled(Button)({
  width: '143px',
  margin: '0 auto'
});

const StyledDivider = styled(Divider)({
  border: '1px dashed #94A4AD'
});

const StyledLink = styled(Link)({
  cursor: 'pointer',
  width: 'fit-content',
  marginTop: '5px !important',
  '&:hover': {
    textDecoration: 'none'
  }
});