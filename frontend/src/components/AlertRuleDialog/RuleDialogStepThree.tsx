import { Box, Button, Stack } from '@mui/material';
import Divider from '@mui/material/Divider';
import {
  MonitorOptions,
  OperatorsEnum,
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost
} from 'api/generated';
import { ChartData } from 'chart.js';
import { SelectCondition } from 'components/Dashboard/MonitorDrawer/components/CreateAlertForm/SelectCondition';
import { MonitorDrawerGraph } from 'components/Dashboard/MonitorDrawer/components/MonitorDrawerGraph';
import dayjs from 'dayjs';
import { GraphData } from 'helpers/types';
import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import useModels from 'helpers/hooks/useModels';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AlertRuleStepBaseProps } from './AlertRuleDialogContent';
import { AlertRuleDialogContext } from './AlertRuleDialogContext';

export const AlertRuleDialogStepThree = ({ handleNext, handleBack }: AlertRuleStepBaseProps) => {
  const { monitor, alertRule, setAlertRule } = useContext(AlertRuleDialogContext);

  const [numericValue, setNumericValue] = useState<string | number>(alertRule.condition.value || 0);
  const [operator, setOperator] = useState<OperatorsEnum | ''>(alertRule.condition.operator);
  const [graphData, setGraphData] = useState<ChartData<'line', GraphData> | null>(null);
  const { modelsMap } = useModels();

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
  }, [monitor, endTime, handleGraphLookBack]);

  const finish = () => {
    alertRule.condition = {
      operator: operator as OperatorsEnum,
      value: +numericValue
    };
    setAlertRule(alertRule);
    handleNext();
  };
  return (
    <Box component="form" sx={{ mt: 5, mb: 5 }}>
      <Box sx={{ width: '100%' }}>
        <Stack direction="row" alignItems="center" gap={{ xs: '100px', xl: '155px' }} justifyContent="center">
          <Box width={0.3} marginTop="25px">
            <SelectCondition
              operator={operator}
              setOperator={setOperator}
              value={+numericValue}
              setValue={setNumericValue}
            />
            <Box sx={{ width: '100%', textAlign: 'end', mt: '60px' }}>
              <Button onClick={handleBack} sx={{ mr: '20px' }} variant="outlined">
                {'Back'}
              </Button>
              <Button onClick={finish} sx={{ mr: 0 }} disabled={!operator || numericValue === undefined}>
                {'Save'}
              </Button>
            </Box>
          </Box>
          <Divider orientation="vertical" flexItem light />
          <MonitorDrawerGraph graphData={graphData} isLoading={isRunCheckLoading} timeFreq={monitor?.frequency} />
        </Stack>
      </Box>
    </Box>
  );
};
