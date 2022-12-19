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
  subtitle: string;
  filters: MonitorTypeConf[];
  activeFilter: AnalysisItemFilterTypes | null;
  isMostWorstActive: boolean;
  setActiveFilter: SetStateType<AnalysisItemFilterTypes | null>;
  setSingleSelectValue: SetStateType<string>;
  multipleSelectValue: string[];
  setMultipleSelectValue: SetStateType<string[]>;
  setIsMostWorstActive: SetStateType<boolean>;
  sx?: SxProps;
}

export function AnalysisChartItemWithFilters({
  children,
  filters,
  activeFilter,
  isMostWorstActive,
  setActiveFilter,
  setSingleSelectValue,
  setMultipleSelectValue,
  setIsMostWorstActive,
  subtitle,
  title,
  sx
}: PropsWithChildren<AnalysisChartItemWithFiltersProps>) {
  return (
    <AnalysisChartItem
      subtitle={subtitle}
      title={title}
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
                type={type}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                setSelectValue={setSingleSelectValue}
                isMostWorstActive={isMostWorstActive}
                setIsMostWorstActive={setIsMostWorstActive}
              />
            ) : (
              <MultiSelect
                key={index + type}
                label={type}
                data={values}
                type={(type as AnalysisItemFilterTypes)}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                setSelectValue={setMultipleSelectValue}
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
