import React, { PropsWithChildren } from 'react';

import { CheckConfigSchemaParams, MonitorTypeConf } from 'api/generated';

import { SelectProps, Stack } from '@mui/material';
import { SxProps } from '@mui/system';

import { AnalysisChartItem } from '../AnalysisChartItem';
import SingleSelect from './AnalysisItemSelect/SingleSelect';
import MultiSelect from './AnalysisItemSelect/MultiSelect';

import { AnalysisItemFilterTypes } from '../../AnalysisItem.types';
import { SetStateType } from 'helpers/types';

interface AnalysisChartItemWithFiltersProps extends SelectProps {
  title: string;
  docs_link?: string | null;
  subtitle: string;
  filters: MonitorTypeConf[];
  filteredValues: Record<AnalysisItemFilterTypes, string[]>;
  setfilteredValues: SetStateType<Record<AnalysisItemFilterTypes, string[]>>;
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
  setfilteredValues,
  isMostWorstActive,
  setIsMostWorstActive,
  subtitle,
  isDriftCheck,
  title,
  docs_link,
  sx
}: PropsWithChildren<AnalysisChartItemWithFiltersProps>) {
  return (
    <AnalysisChartItem
      subtitle={subtitle}
      title={title}
      docs_link={docs_link}
      sx={{
        ...sx
      }}
      headerChildren={
        <Stack direction="row" spacing="10px">
          {filters.map(({ type, values }, index) =>
            type === AnalysisItemFilterTypes.AGGREGATION ? (
              <SingleSelect
                checkParams={checkParams}
                key={index + type}
                label={type}
                data={values}
                isDriftCheck={isDriftCheck}
                type={type}
                filteredValues={filteredValues}
                setfilteredValues={setfilteredValues}
                isMostWorstActive={isMostWorstActive}
                setIsMostWorstActive={setIsMostWorstActive}
              />
            ) : (
              <MultiSelect
                key={index + type}
                checkParams={checkParams}
                label={type}
                data={values}
                type={(type as AnalysisItemFilterTypes)}
                filteredValues={filteredValues}
                setfilteredValues={setfilteredValues}
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
