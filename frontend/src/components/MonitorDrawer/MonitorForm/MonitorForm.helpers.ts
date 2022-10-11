import { MonitorSchema, OperatorsEnum } from 'api/generated';

import { IContext } from 'Context';

export const timeWindow = [
  { label: '1 hour', value: 60 * 60 },
  { label: '1 day', value: 60 * 60 * 24 },
  { label: '1 week', value: 60 * 60 * 24 * 7 },
  { label: '1 month', value: 60 * 60 * 24 * 31 },
  { label: '3 months', value: 60 * 60 * 24 * 31 * 3 }
];

export const checkInfoInitValue = () => ({
  check_conf: {}
});

export const formikInitValues = (monitor: MonitorSchema | undefined) => ({
  name: monitor?.name || '',
  category: (monitor?.data_filters?.filters[0].value as string) || '',
  column: monitor?.data_filters?.filters[0].column || '',
  numericValue: monitor ? (monitor.data_filters?.filters[0].value as number) || 0 : '',
  lookback: monitor?.lookback || '',
  additional_kwargs: monitor?.additional_kwargs || checkInfoInitValue(),
  frequency: monitor?.frequency || '',
  aggregation_window: monitor?.aggregation_window || '',
  check: '',
  model: ''
});

type formikInitValuesReturnType = ReturnType<typeof formikInitValues>;
type monitorSchemaDataMonitor = MonitorSchema | undefined;
type monitorSchemaDataOperator = 'greater_than' | 'contains' | undefined;
type monitorSchemaDataOperatorValue = string | number | undefined;

export const monitorSchemaData = (
  values: formikInitValuesReturnType,
  monitor: monitorSchemaDataMonitor,
  globalState: IContext,
  operator: monitorSchemaDataOperator,
  value: monitorSchemaDataOperatorValue
) => ({
  name: monitor?.name || values.name,
  lookback: +values.lookback,
  aggregation_window: +values.aggregation_window,
  frequency: +values.frequency,
  dashboard_id: monitor ? monitor.dashboard_id : globalState.dashboard_id,
  additional_kwargs: values.additional_kwargs,
  data_filters:
    values.column && operator && value
      ? {
          filters: [
            {
              column: values.column,
              operator: operator || OperatorsEnum.contains,
              value: value || values.category
            }
          ]
        }
      : undefined
});
