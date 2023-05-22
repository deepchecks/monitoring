import React, { useContext, useMemo, useState, useImperativeHandle, forwardRef, useEffect } from 'react';

import { Frequency, MonitorCheckConfSchema } from 'api/generated';

import { Box, Checkbox, FormControlLabel, MenuItem, OutlinedInput, Stack, Typography } from '@mui/material';

import useModels from 'helpers/hooks/useModels';
import { SelectValues } from 'helpers/types';
import { freqTimeWindow, buildFilters } from 'helpers/monitorFields.helpers';
import { FilteredValues, unionCheckConf } from 'helpers/utils/checkUtil';
import { FrequencyMap, FrequencyNumberMap, FrequencyNumberType } from 'helpers/utils/frequency';

import { SelectCheck } from 'components/Select/SelectCheck';
import { MarkedSelect } from 'components/MarkedSelect';
import { AlertRuleDialogContext } from '../AlertRuleDialogContext';
import { TooltipInputWrapper } from 'components/TooltipInputWrapper';
import { SelectColumn } from 'components/Select/SelectColumn';

import { StyledContentContainer } from '../AlertRuleDialog.styles';
import { AlertRuleStepBaseProps } from '../AlertRuleDialog.type';
import { constants } from '../alertRuleDialog.constants';

const {
  aggregationPlaceholder,
  frequency: { tooltipTitle: frequencyTooltipTitle, label: frequencyLabel },
  checkBoxLabel
} = constants.stepTwo;

export const AlertRuleDialogStepTwo = forwardRef(({ setNextButtonDisabled }: AlertRuleStepBaseProps, ref) => {
  const { monitor, setMonitor, alertRule } = useContext(AlertRuleDialogContext);
  const { models: modelsList } = useModels();

  const [model, setModel] = useState<SelectValues>(monitor?.check.model_id || '');
  const [check, setCheck] = useState<SelectValues>(monitor?.check.id || '');
  const [isValidConfig, setIsValidConfig] = useState(true);

  const [filteredValues, setFilteredValues] = useState<FilteredValues>(
    unionCheckConf(monitor?.check?.config?.params, monitor?.additional_kwargs?.check_conf)
  );
  const [resConf, setResConf] = useState<string | undefined>();

  const [dashboardId, setDashboardId] = useState<number | null>(
    monitor?.dashboard_id === undefined ? 1 : monitor?.dashboard_id
  );

  const [frequency, setFrequency] = useState<SelectValues>(
    FrequencyMap[monitor?.frequency as Frequency] ?? freqTimeWindow[0].value
  );

  const [aggregationWindow, setAggregationWindow] = useState(monitor?.aggregation_window ?? 1);

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
      monitor.frequency = FrequencyNumberMap[+frequency as FrequencyNumberType['type']];
      monitor.dashboard_id = dashboardId;
      monitor.aggregation_window = +aggregationWindow;
      (monitor.additional_kwargs = (additionalKwargs as MonitorCheckConfSchema) || undefined),
        (monitor.data_filters = buildFilters(column, category, numericValue) || undefined);
      setMonitor(monitor);
    }
  };

  useImperativeHandle(ref, () => ({
    next() {
      finish();
    }
  }));

  useEffect(() => {
    setNextButtonDisabled(!model || !check || !frequency || !aggregationWindow || !isValidConfig);
  }, [model, check, frequency, aggregationWindow, isValidConfig]);

  const aggregationWindowErr = aggregationWindow > 30;
  const aggregationWindowSuffix = `${FrequencyNumberMap[frequency as FrequencyNumberType['type']]}${
    aggregationWindow > 1 ? 'S' : ''
  }`;

  return (
    <StyledContentContainer>
      <Stack spacing={2.3} width={1}>
        <MarkedSelect
          size="medium"
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
          setIsValidConfig={setIsValidConfig}
          disabled={!!alertRule.id || !model}
          size="medium"
        />
        <Box display="grid" gridTemplateColumns="70% auto" gap="24px">
          <TooltipInputWrapper title={frequencyTooltipTitle}>
            <MarkedSelect
              label={frequencyLabel}
              value={frequency}
              onChange={event => setFrequency(event.target.value as number)}
              clearValue={() => {
                setFrequency(freqTimeWindow[0].value);
                setAggregationWindow(1);
              }}
              fullWidth
              size="medium"
            >
              {freqTimeWindow.map(({ label, value }, index) => (
                <MenuItem key={value + index} value={value}>
                  {label}
                </MenuItem>
              ))}
            </MarkedSelect>
          </TooltipInputWrapper>
          <OutlinedInput
            sx={{ '@media (max-width: 1536px)': { height: '36px' } }}
            placeholder={aggregationPlaceholder}
            size="medium"
            value={aggregationWindow}
            onChange={event => setAggregationWindow(Number(event.target.value))}
            endAdornment={aggregationWindowSuffix}
            inputProps={{ min: 0, max: 30 }}
            error={aggregationWindowErr}
            type="number"
            fullWidth
            required
          />
          {aggregationWindowErr && <Typography color="red">aggregation window max value is 30</Typography>}
        </Box>
        <SelectColumn
          model={model}
          column={column}
          setColumn={setColumn}
          category={category}
          setCategory={setCategory}
          numericValue={numericValue}
          setNumericValue={setNumericValue}
          size="medium"
        />
        <FormControlLabel
          style={{ marginTop: '8px' }}
          control={<Checkbox checked={!!dashboardId} onChange={e => setDashboardId(e.target.checked ? 1 : null)} />}
          label={checkBoxLabel}
        />
      </Stack>
    </StyledContentContainer>
  );
});

AlertRuleDialogStepTwo.displayName = 'AlertRuleDialogStepTwo';
