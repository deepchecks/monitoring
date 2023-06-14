import { SelectValues } from 'helpers/types';
import { timeValues } from 'helpers/base/time';

export function getLookBack(frequency: SelectValues) {
  switch (frequency) {
    case timeValues.hour:
      return timeValues.week;

    case timeValues.day:
      return timeValues.month;

    case timeValues.week:
      return timeValues.threeMonths;

    case timeValues.month:
      return timeValues.year;

    default:
      return timeValues.month;
  }
}
