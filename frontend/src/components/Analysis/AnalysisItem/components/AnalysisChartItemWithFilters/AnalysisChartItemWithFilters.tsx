import React, { PropsWithChildren } from 'react';

import { CheckConfigSchemaParams, MonitorTypeConf } from 'api/generated';

import { SelectProps, Stack } from '@mui/material';
import { SxProps } from '@mui/system';

import { AnalysisChartItem } from '../AnalysisChartItem';
import SingleSelect from './AnalysisItemSelect/SingleSelect';
import MultiSelect from './AnalysisItemSelect/MultiSelect';

import { SetStateType } from 'helpers/types';
import { CheckFilterTypes, FilteredValues } from 'helpers/utils/checkUtil';

interface AnalysisChartItemWithFiltersProps extends SelectProps {
  title: string;
  docsLink?: string | null;
  subtitle: string;
  filters: MonitorTypeConf[];
  filteredValues: FilteredValues;
  setFilteredValues: SetStateType<FilteredValues>;
  checkParams: CheckConfigSchemaParams;
  isMostWorstActive: boolean;
  isDriftCheck: boolean;
  setIsMostWorstActive: SetStateType<boolean>;
  sx?: SxProps;
}

export function AnalysisChartItemWithFilters({
  children,
  filters,
  checkParams,
  filteredValues,
  setFilteredValues,
  isMostWorstActive,
  setIsMostWorstActive,
  subtitle,
  isDriftCheck,
  title,
  docsLink,
  sx
}: PropsWithChildren<AnalysisChartItemWithFiltersProps>) {
  return (
    <AnalysisChartItem
      subtitle={subtitle}
      title={title}
      docsLink={docsLink}
      sx={{
        ...sx
      }}
      headerChildren={
        <Stack direction="row" spacing="10px">
          {filters.map(({ type, values }, index) =>
            type === CheckFilterTypes.AGGREGATION ? (
              <SingleSelect
                checkParams={checkParams}
                key={index + type}
                label={type}
                data={values}
                isDriftCheck={isDriftCheck}
                type={type}
                filteredValues={filteredValues}
                setFilteredValues={setFilteredValues}
                isMostWorstActive={isMostWorstActive}
                setIsMostWorstActive={setIsMostWorstActive}
              />
            ) : (
              <MultiSelect
                key={index + type}
                checkParams={checkParams}
                label={type}
                data={values}
                type={type as CheckFilterTypes}
                filteredValues={filteredValues}
                setFilteredValues={setFilteredValues}
                isMostWorstActive={isMostWorstActive}
                setIsMostWorstActive={setIsMostWorstActive}
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
