import { Frequency } from 'api/generated';

export const frequencyValues = {
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
  MONTH: 2592000
};

export const FrequencyMap = {
  [Frequency.HOUR]: 3600,
  [Frequency.DAY]: 86400,
  [Frequency.WEEK]: 604800,
  [Frequency.MONTH]: 2592000
} as const;

export const FrequencyNumberMap = {
  3600: Frequency.HOUR,
  86400: Frequency.DAY,
  604800: Frequency.WEEK,
  2592000: Frequency.MONTH
} as const;

export interface FrequencyNumberType {
  type: 3600 | 86400 | 604800 | 2592000;
}
