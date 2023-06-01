import { DataFilter, MonitorCreationSchemaAdditionalKwargs, OperatorsEnum } from 'api/generated';

import { timeValues } from 'helpers/base/time';
import { SelectValues } from 'helpers/types';

export const freqTimeWindow = [
  { label: 'Hour', value: timeValues.hour },
  { label: 'Day', value: timeValues.day },
  { label: 'Week', value: timeValues.week },
  { label: 'Month', value: timeValues.month }
];

export const lookbackTimeWindow = freqTimeWindow.filter(obj => obj.value != timeValues.hour);
lookbackTimeWindow.push({ label: '1 year', value: timeValues.year });

export const buildKwargs = (
  isResConf: boolean | undefined,
  checkInfoFirstLevel: SelectValues,
  checkInfoSecondLevel: SelectValues
) =>
  (isResConf
    ? {
        check_conf: { ...(checkInfoFirstLevel && { scorer: [checkInfoFirstLevel] }) },
        res_conf: checkInfoSecondLevel ? [checkInfoSecondLevel] : null
      }
    : {
        check_conf: {
          ...(checkInfoFirstLevel && { 'aggregation method': [checkInfoFirstLevel] }),
          ...(checkInfoSecondLevel && { feature: [checkInfoSecondLevel] })
        },
        res_conf: null
      }) as MonitorCreationSchemaAdditionalKwargs;

export const buildFilters = (
  column: string | undefined,
  category: SelectValues,
  numericValue: number[] | undefined
) => {
  const filter: DataFilter[] = [];

  if (column) {
    if (category) {
      filter.push({ column, operator: OperatorsEnum.equals, value: category });
    } else if (numericValue) {
      filter.push({ column, operator: OperatorsEnum.greater_than_equals, value: numericValue[0] });
      filter.push({ column, operator: OperatorsEnum.less_than_equals, value: numericValue[1] });
    }
  }

  return column && filter?.length
    ? {
        filters: filter
      }
    : null;
};
