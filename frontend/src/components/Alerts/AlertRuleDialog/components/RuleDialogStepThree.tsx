import React, { useCallback, useContext, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { ChartData } from 'chart.js';
import dayjs from 'dayjs';

import { Box, Stack } from '@mui/material';

import {
  MonitorOptions,
  OperatorsEnum,
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost
} from 'api/generated';

import { AlertRuleDialogContext } from '../AlertRuleDialogContext';

import { SelectCondition } from 'components/Dashboard/MonitorDialog/components/CreateAlertForm/SelectCondition';
import { MonitorDialogGraph } from 'components/Dashboard/MonitorDialog/components/MonitorDialogGraph';

import { GraphData } from 'helpers/types';
import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import useModels from 'helpers/hooks/useModels';
import { FrequencyMap } from 'helpers/utils/frequency';

import { AlertRuleStepBaseProps } from '../AlertRuleDialog.type';

export const AlertRuleDialogStepThree = forwardRef(({ setNextButtonDisabled }: AlertRuleStepBaseProps, ref) => {
  const { monitor, alertRule, setAlertRule } = useContext(AlertRuleDialogContext);
  const { modelsMap } = useModels();

  const [numericValue, setNumericValue] = useState<string | number>(alertRule.condition.value || 0);
  const [operator, setOperator] = useState<OperatorsEnum | ''>(alertRule.condition.operator);
  const [graphData, setGraphData] = useState<ChartData<'line', GraphData> | null>(null);

  useEffect(() => {
    setOperator(alertRule.condition.operator);
    setNumericValue(alertRule.condition.value || 0);
  }, [alertRule]);

  const { mutateAsync: runCheck, isLoading: isRunCheckLoading } =
    useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const handleGraphLookBack = useCallback(
    async (checkId: number, data: MonitorOptions) => {
      if (typeof checkId !== 'number') return setGraphData(null);

      try {
        const response = await runCheck({
          checkId,
          data
        });
        const parsedChartData = parseDataForLineChart(response);
        setGraphData(parsedChartData);
      } catch (e) {
        setGraphData(null);
      }
    },
    [runCheck, setGraphData]
  );

  const endTime =
    (modelsMap && modelsMap[monitor.check.model_id] && modelsMap[monitor.check.model_id].latest_time) ?? Date.now();

  useEffect(() => {
    handleGraphLookBack(monitor.check.id, {
      filter: monitor.data_filters,
      end_time: dayjs.unix(endTime).toISOString(),
      start_time: dayjs.unix(endTime).subtract(30, 'day').toISOString(),
      additional_kwargs: monitor.additional_kwargs,
      frequency: monitor.frequency,
      aggregation_window: monitor.aggregation_window
    });
  }, []);

  const finish = () => {
    alertRule.condition = {
      operator: operator as OperatorsEnum,
      value: +numericValue
    };
    setAlertRule(alertRule);
  };

  useImperativeHandle(ref, () => ({
    next() {
      finish();
    }
  }));

  useEffect(() => {
    setNextButtonDisabled(!operator || !numericValue);
  }, [operator, numericValue]);

  return (
    <Stack alignItems="center" gap={2} justifyContent="center">
      <Box marginBottom="25px">
        <SelectCondition
          operator={operator}
          setOperator={setOperator}
          value={+numericValue}
          setValue={setNumericValue}
        />
      </Box>
      <Box width="536px" height="350px" marginBottom="30px">
        <MonitorDialogGraph
          graphData={graphData}
          isLoading={isRunCheckLoading}
          timeFreq={FrequencyMap[monitor?.frequency]}
        />
      </Box>
    </Stack>
  );
});

AlertRuleDialogStepThree.displayName = 'AlertRuleDialogStepThree';
