import { Box, Button, MenuItem, Stack } from '@mui/material';
import { SelectCheck } from 'components/SelectCheck';
import { AlertRuleStepBaseProps } from './AlertRuleDialogContent';
import { MarkedSelect } from 'components/MarkedSelect';
import useModels from 'hooks/useModels';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { SelectValues } from 'helpers/types';
import { AlertRuleDialogContext } from './AlertRuleDialogContext';
import { TooltipInputWrapper } from 'components/TooltipInputWrapper';
import { ControlledMarkedSelect } from 'components/MarkedSelect/ControlledMarkedSelect';

import { timeWindow, buildFilters } from 'helpers/monitorFields.helpers';
import { SelectColumn } from 'components/SelectColumn';
import { FilteredValues } from 'components/AnalysisItem/AnalysisItem.types';
import { MonitorCheckConfSchema } from 'api/generated';

export const AlertRuleDialogStepTwo = ({ handleNext, handleBack }: AlertRuleStepBaseProps) => {
  const { monitor, setMonitor, alertRule } = useContext(AlertRuleDialogContext);
  const { models: modelsList } = useModels();
  const [model, setModel] = useState<SelectValues>(monitor?.check.model_id || '');

  const [check, setCheck] = useState<SelectValues>(monitor?.check.id || '');

  const [filteredValues, setFilteredValues] = useState<FilteredValues>({} as FilteredValues);
  const [resConf, setResConf] = useState<string | undefined>(undefined);

  const [frequency, setFrequency] = useState<SelectValues>(monitor?.frequency || '');
  const [aggregationWindow, setAggregationWindow] = useState<SelectValues>(monitor?.aggregation_window || '');

  const [column, setColumn] = useState<string | undefined>(monitor?.data_filters?.filters?.[0]?.column || '');
  const [category, setCategory] = useState<SelectValues>(() => {
    const filters = monitor?.data_filters?.filters;
    if (filters?.length) {
      return filters.length > 1
        ? undefined
        : filters[0].value as string;
    }});
  const [numericValue, setNumericValue] = useState<number[] | undefined>(() => {
    const filters = monitor?.data_filters?.filters;
    if (filters?.length) {
      return filters.length > 1
        ? [filters[0].value as number, filters[1].value as number]
        : undefined;
    }});

  const clearAggregationWindow = useCallback(() => {
    setAggregationWindow('');
    setFrequency('');
  }, []);

  const additionalKwargs = useMemo(() => {
    if (Object.keys(filteredValues).length) {
      const additionalKwargs = {
        check_conf: filteredValues,
        res_conf: resConf ? [resConf] : undefined
      };

      return additionalKwargs;
    }
  }, [filteredValues, resConf]);

  const finish = () => {
    if (model && check && frequency && aggregationWindow) {
      // Setting the context values
      monitor.check.model_id = +model;
      monitor.check.id = +check;
      monitor.frequency = +frequency;
      monitor.aggregation_window = +aggregationWindow;
      monitor.additional_kwargs = additionalKwargs as MonitorCheckConfSchema || undefined,
      monitor.data_filters = buildFilters(column, category, numericValue) || undefined;
      setMonitor(monitor);
      console.log(monitor);

      handleNext();
    }
  };
  return (
    <Box
      component="form"
      sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', mt: 5, mb: 5 }}
    >
      <Box sx={{ maxWidth: 400, width: '100%' }}>
        <Stack spacing={4}>
          <MarkedSelect
            label="Model"
            value={model}
            onChange={event => {
              setModel(event.target.value as string);
            }}
            clearValue={() => {
              setModel('');
            }}
            disabled={!!alertRule.id}
          >
            {modelsList.map(({ name, id }) => (
              <MenuItem key={id} value={id}>
                {name}
              </MenuItem>
            ))}
          </MarkedSelect>
          <SelectCheck
            monitor={monitor}
            model={model}
            check={check}
            setCheck={setCheck}
            filteredValues={filteredValues}
            setFilteredValues={setFilteredValues}
            resConf={resConf}
            setResConf={setResConf}
            disabled={!!alertRule.id || !model}
          />
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
          <TooltipInputWrapper title="The frequency of sampling the monitor data">
            <MarkedSelect
              label="Frequency"
              value={frequency}
              onChange={event => setFrequency(event.target.value as number)}
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
                  disabled={typeof aggregationWindow === 'number' && value > aggregationWindow}
                >
                  {label}
                </MenuItem>
              ))}
            </MarkedSelect>
          </TooltipInputWrapper>
          <SelectColumn
            model={model}
            column={column}
            setColumn={setColumn}
            category={category}
            setCategory={setCategory}
            numericValue={numericValue}
            setNumericValue={setNumericValue}
          />
        </Stack>

        <Box sx={{ textAlign: 'end', mt: '60px' }}>
          <Button onClick={handleBack} sx={{ mr: '20px' }} variant="outlined">
            {'Back'}
          </Button>
          <Button onClick={finish} sx={{ mr: 0 }} disabled={!model || !check || !frequency || !aggregationWindow}>
            {'Next'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
