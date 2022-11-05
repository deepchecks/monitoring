import { timeMap, timeValues } from 'helpers/timeValue';

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
