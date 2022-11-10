import React, { Dispatch, PropsWithChildren, SetStateAction } from 'react';

import { MonitorCheckConfSchemaCheckConf } from 'api/generated';

import { SelectProps, Stack } from '@mui/material';

import { AnalysisChartItem } from 'components/AnalysisChartItem';
import SingleSelect from './AnalysisItemSelect/SingleSelect';
import MultiSelect from './AnalysisItemSelect/MultiSelect';

const AGGREGATION = 'aggregation method';

interface AnalysisChartItemWithFiltersProps extends SelectProps {
  title: string;
  subtitle: string;
  filters: MonitorCheckConfSchemaCheckConf[];
  activeFilter: string | null;
  setActiveFilter: Dispatch<SetStateAction<string | null>>;
  setSingleSelectValue: Dispatch<SetStateAction<string>>;
  multipleSelectValue: string[];
  setMultipleSelectValue: Dispatch<SetStateAction<string[]>>;
}

export function AnalysisChartItemWithFilters({
  children,
  filters,
  activeFilter,
  setActiveFilter,
  setSingleSelectValue,
  setMultipleSelectValue,
  subtitle,
  title
}: PropsWithChildren<AnalysisChartItemWithFiltersProps>) {
  return (
    <AnalysisChartItem
      subtitle={subtitle}
      title={title}
      headerChildren={
        <Stack direction="row" spacing="10px">
          {filters.map(({ type, values }) =>
            type === AGGREGATION ? (
              <SingleSelect
                label={type}
                data={values}
                type={type}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                setSelectValue={setSingleSelectValue}
              />
            ) : (
              <MultiSelect
                label={type}
                data={values}
                type={type}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                setSelectValue={setMultipleSelectValue}
              />
            )
          )}
        </Stack>
      }
    >
      {children}
    </AnalysisChartItem>
  );
}
