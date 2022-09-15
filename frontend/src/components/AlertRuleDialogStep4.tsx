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

export type AlertRuleDialogStep4Values = Condition & Pick<AlertRuleSchema, 'repeat_every'>;

export type AlertRuleDialogStep4 = AlertRuleDialogStepBase<AlertRuleDialogStep4Values> & {
  monitor: MonitorSchema;
};

const validationSchema = yup.object().shape({
  operator: yup.string().required('Operator is required'),
  value: yup.number().required('Value is required')
});

export const AlertRuleDialogStep4: FC<AlertRuleDialogStep4> = ({ monitor, ...props }) => {
  const [graphData, setGraphData] = useState<ChartData<'line', GraphData>>();

  const { mutateAsync: runCheck, isLoading } = useRunStandaloneCheckPerWindowInRangeApiV1ChecksCheckIdRunLookbackPost();

  const {
    lookback,
    data_filters: filter,
    check: { id: checkId }
  } = monitor;

  const updateGraphData = async () => {
    if (!checkId) return;

    const data = await runCheck({
      checkId,
      data: {
        start_time: new Date(Date.now() - lookback * 1000).toISOString(),
        end_time: new Date().toISOString(),
        filter: filter?.filters[0].column ? filter : undefined
      }
    });

    setGraphData(parseDataForChart(data) as ChartData<'line', GraphData>);
  };

  useEffect(() => {
    updateGraphData();
  }, [monitor]);

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
      <AlertRuleDialogStep<AlertRuleDialogStep4Values>
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
            <SelectTimeframe
              label="Repeat Every"
              name="repeat_every"
              prefix="Every"
              {...getFieldProps('repeat_every')}
            />
          </>
        )}
      </AlertRuleDialogStep>
      <Box sx={{ flexBasis: '50%' }}>{renderGraph()}</Box>
    </Stack>
  );
};
