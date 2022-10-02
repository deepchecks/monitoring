import React, { FC, useEffect, useState } from 'react';
import * as yup from 'yup';
import {
  AlertRuleSchema,
  Condition,
  MonitorSchema,
  useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost
} from '../api/generated';
import { AlertRuleDialogStep, AlertRuleDialogStepBase } from './AlertRuleDialogStep';
import { SelectCondition } from './SelectCondition';
import { SelectTimeframe } from './SelectTimeframe';
import { Box, Divider, Stack } from '@mui/material';
import { ChartData } from 'chart.js';
import { GraphData } from '../helpers/types';
import DiagramLine from './DiagramLine';
import { Loader } from './Loader';
import { NoDataToShow } from '../assets/icon/icon';
import { parseDataForChart } from '../helpers/utils/parseDataForChart';
import dayjs from 'dayjs';
import useModels from 'hooks/useModels';

export type AlertRuleDialogStep3Values = Condition;

export type AlertRuleDialogStep3 = AlertRuleDialogStepBase<AlertRuleDialogStep3Values> & {
  monitor: MonitorSchema;
};

const validationSchema = yup.object().shape({
  operator: yup.string().required('Operator is required'),
  value: yup.number().required('Value is required')
});

export const AlertRuleDialogStep3: FC<AlertRuleDialogStep3> = ({ monitor, ...props }) => {
  const [graphData, setGraphData] = useState<ChartData<'line', GraphData>>();

  const { mutateAsync: runCheck, isLoading } = useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const { modelsMap } = useModels();
  const {
    data_filters: filter,
    check: { id: checkId, model_id: modelId },
    frequency: frequency,
    aggregation_window: aggregation_window
  } = monitor;

  const updateGraphData = async () => {
    if (!checkId) return;

    const endTime = modelsMap[modelId].latest_time ?? Date.now();
    const data = await runCheck({
      checkId,
      data: {
        start_time: new Date((endTime * 1000) - dayjs.duration(1, 'months').asMilliseconds()).toISOString(),
        end_time: dayjs.unix(endTime).toISOString(),
        filter: filter?.filters[0].column ? filter : undefined,
        frequency: frequency,
        aggregation_window: aggregation_window
      }
    });

    setGraphData(parseDataForChart(data) as ChartData<'line', GraphData>);
  };

  useEffect(() => {
    updateGraphData();
  }, [monitor, monitor.frequency, monitor.aggregation_window]);

  const renderGraph = () => {
    if (isLoading) return <Loader />;
    if (!graphData) return <NoDataToShow />;
    return <DiagramLine data={graphData} />;
  };

  return (
    <Stack
      direction="row"
      divider={<Divider orientation="vertical" flexItem light sx={{ borderStyle: 'dashed' }} />}
      spacing={2}
      m="50px"
      alignItems="center"
      justifyContent="space-evenly"
    >
      <AlertRuleDialogStep<AlertRuleDialogStep3Values>
        {...props}
        sx={{ flexBasis: '50%' }}
        validationSchema={validationSchema}
      >
        {({ getFieldProps, setFieldValue }) => (
          <>
            <SelectCondition
              operatorProps={getFieldProps('operator')}
              valueProps={getFieldProps('value')}
              setFieldValue={setFieldValue}
            />
          </>
        )}
      </AlertRuleDialogStep>
      <Box sx={{ flexBasis: '50%' }}>{renderGraph()}</Box>
    </Stack>
  );
};
