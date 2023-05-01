import React from 'react';
import { SelectPrimary, SelectPrimaryProps, SelectPrimaryItem } from './SelectPrimary';
import useStatsTime, { labelPrefix } from '../../helpers/hooks/useStatsTime';

interface SelectTimeframeProps extends Omit<SelectPrimaryProps, 'children' | 'label'> {
  label?: SelectPrimaryProps['label'];
  prefix?: string;
}

export const SelectTimeframe = ({ label = 'Timeframe', prefix = labelPrefix, ...props }: SelectTimeframeProps) => {
  const [, , _times] = useStatsTime();

  const times = _times.map(({ label, ...time }) => ({ ...time, label: label.replace(labelPrefix, prefix) }));

  return (
    <SelectPrimary label={label} {...props}>
      {times.map(({ label, value }) => (
        <SelectPrimaryItem value={value} key={label}>
          {label}
        </SelectPrimaryItem>
      ))}
    </SelectPrimary>
  );
};
