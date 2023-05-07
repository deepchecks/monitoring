import React, { useMemo } from 'react';
import { SelectPrimary, SelectPrimaryProps, SelectPrimaryItem } from './SelectPrimary';
import { AlertSeverity } from 'api/generated';
import mapToOptionsList from '../../helpers/utils/mapToOptionsList';

export const severityAll = 'all';
export type SeverityAll = 'all';

export const SEVERITIES = mapToOptionsList({ [severityAll]: severityAll, ...AlertSeverity });

interface SelectSeverityProps extends Omit<SelectPrimaryProps, 'children' | 'label'> {
  allowAll?: boolean;
  label?: SelectPrimaryProps['label'];
}

export const SelectSeverity = ({ allowAll = false, label = 'Severity', ...props }: SelectSeverityProps) => {
  const severitiesList = useMemo(
    () => (allowAll ? SEVERITIES : SEVERITIES.filter(({ value }) => value !== severityAll)),
    [allowAll]
  );

  return (
    <SelectPrimary label={label} {...props}>
      {severitiesList.map(({ label, value }) => (
        <SelectPrimaryItem value={value} key={label}>
          {label}
        </SelectPrimaryItem>
      ))}
    </SelectPrimary>
  );
};
