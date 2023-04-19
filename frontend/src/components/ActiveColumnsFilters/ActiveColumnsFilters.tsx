import React, { useContext, useMemo, useCallback } from 'react';

import { AnalysisContext, FilterValue } from 'helpers/context/AnalysisProvider';

import { Box, Tooltip } from '@mui/material';

import { ColumnChip } from './ColumnChip';

import { buildFiltersChipLabel, cutFiltersChipLabel, MAX_CHARACTERS } from './ActiveColumnsFilters.utils';
import { setParams } from 'helpers/utils/getParams';

export function ActiveColumnsFilters() {
  const { filters, setFilters } = useContext(AnalysisContext);

  const deleteFilter = useCallback(
    (column: string, value: FilterValue) => () => {
      setParams(column);

      if (value) {
        setFilters(prevFilters => {
          if (Array.isArray(value)) {
            return { ...prevFilters, [column]: null };
          }

          const valueToRemove = Object.keys(value).reduce(
            (acc: Record<string, boolean>, key) => ({ ...acc, [key]: acc[key] || false }),
            {}
          );

          return { ...prevFilters, [column]: { ...prevFilters[column], ...valueToRemove } };
        });
      }
    },
    [setFilters]
  );

  const Filters = useMemo(
    () =>
      Object.entries(filters).map(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            return (
              <ColumnChip
                key={`${key}${value[0]}${value[1]}`}
                label={buildFiltersChipLabel(key, value)}
                onDelete={deleteFilter(key, value)}
              />
            );
          }

          const values = Object.keys(value);

          if (!Array.isArray(value) && values.length) {
            const labels: string[] = [];

            values.map(label => {
              if (value[label]) {
                labels.push(label);
              }
            });

            const labelsString = labels.join(', ');

            return (
              !!labels.length &&
              (labelsString.length > MAX_CHARACTERS ? (
                <Tooltip title={labelsString} placement="top" key={`${key}${labelsString}`}>
                  <Box sx={{ height: '36px' }}>
                    <ColumnChip label={cutFiltersChipLabel(key, labelsString)} onDelete={deleteFilter(key, value)} />
                  </Box>
                </Tooltip>
              ) : (
                <ColumnChip
                  key={`${key}${labelsString}`}
                  label={`${key}: ${labelsString}`}
                  onDelete={deleteFilter(key, value)}
                />
              ))
            );
          }
        }
      }),
    [filters, deleteFilter]
  );

  return <>{Filters}</>;
}
