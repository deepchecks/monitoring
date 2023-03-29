import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.extend(duration);

import { MonitorSchema } from 'api/generated';

import processFrequency from 'helpers/utils/processFrequency';
import { FrequencyMap } from 'helpers/utils/frequency';

export const checkInfoInitValue = {
  check_conf: {}
};

export const monitorInfo = (monitor: MonitorSchema, currentModelName: string) => [
  { label: 'Monitor name', value: monitor?.name },
  { label: 'Model name', value: currentModelName },
  { label: 'Check name', value: monitor?.check?.name },
  { label: 'Feature name', value: monitor?.data_filters ? `${monitor?.data_filters.filters[0].column}` : 'N/A' },
  {
    label: 'Frequency',
    value: monitor?.frequency ? processFrequency(dayjs.duration(FrequencyMap[monitor?.frequency], 'seconds')) : 'N/A'
  },
  { label: 'Display range', value: dayjs.duration(monitor.lookback, 'seconds').humanize() }
];
