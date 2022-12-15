import { MonitorSchema, OperatorsEnum, DataFilter } from 'api/generated';

import { IContext } from 'context';

import { timeValues } from 'helpers/time';

export const timeWindow = [
  { label: '1 hour', value: timeValues.hour },
  { label: '1 day', value: timeValues.day },
  { label: '1 week', value: timeValues.week },
  { label: '1 month', value: timeValues.mouth },
  { label: '3 months', value: timeValues.threeMouths }
];

const initialValue = {
  check_conf: {}
}
export const checkInfoInitValue = () => (initialValue);

export const formikInitValues = (monitor: MonitorSchema | undefined) => {
  const filters = (
    monitor?.data_filters?.filters?.length
      ? monitor.data_filters.filters.length > 1
        ? [monitor.data_filters.filters[0].value, monitor.data_filters.filters[1].value]
        : monitor.data_filters.filters[0].value
      : ''
  ) as string | number[];

  return {
    name: monitor?.name || '',
    category: (monitor?.data_filters?.filters[0].value as string) || '',
    column: monitor?.data_filters?.filters[0].column || '',
    numericValue: filters,
    lookback: monitor?.lookback || '',
    additional_kwargs: monitor?.additional_kwargs || checkInfoInitValue(),
    frequency: monitor?.frequency || '',
    aggregation_window: monitor?.aggregation_window || '',
    check: monitor?.check || '',
    model: ''
  };
};

type formikInitValuesReturnType = ReturnType<typeof formikInitValues>;
type monitorSchemaDataMonitor = MonitorSchema | undefined;
type monitorSchemaDataOperator = 'contains' | 'greater_than' | undefined;
type monitorSchemaDataOperatorValue = string | number[] | undefined;
type monitorSchemaDataFilters = DataFilter[];

export const monitorSchemaData = (
  values: formikInitValuesReturnType,
  monitor: monitorSchemaDataMonitor,
  globalState: IContext,
  operator: monitorSchemaDataOperator,
  value: monitorSchemaDataOperatorValue,
  filter?: monitorSchemaDataFilters
) => ({
  name: values.name,
  lookback: +values.lookback,
  aggregation_window: +values.aggregation_window,
  frequency: +values.frequency,
  dashboard_id: monitor ? monitor.dashboard_id : globalState.dashboard_id,
  additional_kwargs: values.additional_kwargs,
  data_filters: values.column
    ? {
        filters: filter?.length
          ? filter
          : [
              {
                column: values.column,
                operator: operator || OperatorsEnum.contains,
                value: value || values.category
              }
            ]
      }
    : undefined
});
