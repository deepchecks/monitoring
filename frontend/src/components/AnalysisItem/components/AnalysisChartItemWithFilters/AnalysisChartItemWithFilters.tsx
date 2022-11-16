import React, { PropsWithChildren } from 'react';

import { MonitorCheckConfSchemaCheckConf } from 'api/generated';

import { SelectProps, Stack } from '@mui/material';

import { AnalysisChartItem } from '../AnalysisChartItem';
import SingleSelect from './AnalysisItemSelect/SingleSelect';
import MultiSelect from './AnalysisItemSelect/MultiSelect';

import { AGGREGATION } from '../../AnalysisItem.variables';
import { SetStateType } from 'helpers/types';

interface AnalysisChartItemWithFiltersProps extends SelectProps {
  title: string;
  subtitle: string;
  filters: MonitorCheckConfSchemaCheckConf[];
  activeFilter: string | null;
  setActiveFilter: SetStateType<string | null>;
  setSingleSelectValue: SetStateType<string>;
  multipleSelectValue: string[];
  setMultipleSelectValue: SetStateType<string[]>;
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
          {filters.map(({ type, values }, index) =>
            type === AGGREGATION ? (
              <SingleSelect
                key={index}
                label={type}
                data={values}
                type={type}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                setSelectValue={setSingleSelectValue}
              />
            ) : (
              <MultiSelect
                key={index}
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
