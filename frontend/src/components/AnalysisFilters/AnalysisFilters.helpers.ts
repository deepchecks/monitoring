import { timeMap, timeValues } from 'helpers/time';

import { ComparisonModeOptions } from 'context/analysis-context';

export const lookBackData = [
  { label: 'Last 7 Days', value: timeMap.week },
  { label: 'Last 30 Days', value: timeMap.month }
];

export const frequencyData = [
  { label: 'Hourly', value: timeValues.hour },
  { label: 'Daily', value: timeValues.day },
  { label: 'Weekly', value: timeValues.week },
  { label: 'Monthly', value: timeValues.mouth }
];

export const comparisonModeData = [
  { label: 'Previous Period', value: ComparisonModeOptions.previousPeriod },
  { label: 'Reference', value: ComparisonModeOptions.reference }
];
