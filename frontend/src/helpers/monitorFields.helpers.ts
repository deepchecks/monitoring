import { DataFilter, MonitorCreationSchemaAdditionalKwargs, OperatorsEnum } from 'api/generated';

import { timeValues } from 'helpers/time';
import { SelectValues } from 'helpers/types';

export const timeWindow = [
  { label: '1 hour', value: timeValues.hour },
  { label: '1 day', value: timeValues.day },
  { label: '1 week', value: timeValues.week },
  { label: '1 month', value: timeValues.month },
  { label: '3 months', value: timeValues.threeMonths }
];

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
