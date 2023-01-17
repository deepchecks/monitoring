import React, { PropsWithChildren } from 'react';

import { MonitorTypeConf } from 'api/generated';

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
  isMostWorstActive: boolean;
  isDriftCheck: boolean;
  setIsMostWorstActive: SetStateType<boolean>;
  sx?: SxProps;
  filteredValues: Record<AnalysisItemFilterTypes, string[]>;
  setfilteredValues: SetStateType<Record<AnalysisItemFilterTypes, string[]>>;
}

export function AnalysisChartItemWithFilters({
  children,
  filters,
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
