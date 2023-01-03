import React, { useEffect, memo } from 'react';

import { MonitorSchema, useGetModelColumnsApiV1ModelsModelIdColumnsGet } from 'api/generated';

import { Stack, MenuItem, SelectChangeEvent } from '@mui/material';

import { MarkedSelect } from 'components/MarkedSelect';
import { ControlledMarkedSelect } from 'components/MarkedSelect/ControlledMarkedSelect';
import { Subcategory } from 'components/Subcategory';
import { RangePicker } from 'components/RangePicker/RangePicker';

import { ColumnType } from 'helpers/types/model';
import { SetStateType, SelectValues } from 'helpers/types';

interface MonitorFormColumnProps {
  monitor: MonitorSchema | null;
  model: SelectValues;
  column: string | undefined;
  setColumn: SetStateType<string | undefined>;
  category: SelectValues;
  setCategory: SetStateType<SelectValues>;
  numericValue: number[] | undefined;
  setNumericValue: SetStateType<number[] | undefined>;
}

const MonitorFormColumnComponent = ({
  monitor,
  model = '',
  column,
  setColumn,
  category,
  setCategory,
  numericValue,
  setNumericValue
}: MonitorFormColumnProps) => {
  const { data: columns, isLoading } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(model);

  useEffect(() => {
    const filters = monitor?.data_filters?.filters;

    if (filters?.length) {
      filters.length > 1
        ? setNumericValue([filters[0].value as number, filters[1].value as number])
        : setCategory(filters[0].value as string);
    }
  }, [monitor?.data_filters?.filters, setCategory, setNumericValue]);

  const resetSubcategory = () => {
    setCategory('');
    setNumericValue(undefined);
  };

  const handleColumnChange = (event: SelectChangeEvent<unknown>) => {
    setColumn(event.target.value as string);
    resetSubcategory();

    if (columns) {
      const currentColumn = columns[event.target.value as string];
      currentColumn?.type === ColumnType.categorical
        ? setCategory(currentColumn?.stats?.values?.[0] || '')
        : setNumericValue([currentColumn?.stats?.min || 0, currentColumn?.stats?.max || 0]);
    }
  };

  return (
    <Stack>
      {columns && !isLoading && (
        <>
          <MarkedSelect
            label={monitor ? 'Filter by Column' : 'Segment'}
            value={column}
            onChange={handleColumnChange}
            clearValue={() => {
              setColumn('');
              resetSubcategory();
            }}
            disabled={!model}
          >
            {Object.keys(columns).map(col => (
              <MenuItem key={col} value={col}>
                {col}
              </MenuItem>
            ))}
          </MarkedSelect>
          {column &&
            (columns[column].type === ColumnType.categorical ? (
              <Subcategory>
                <ControlledMarkedSelect
                  label="Select category"
                  values={columns[column].stats.values || []}
                  value={category}
                  setValue={setCategory}
                  clearValue={() => setCategory('')}
                />
              </Subcategory>
            ) : (
              numericValue && (
                <RangePicker
                  min={columns[column].stats.min || 0}
                  max={columns[column].stats.max || 0}
                  numericValue={numericValue}
                  setNumericValue={setNumericValue}
                />
              )
            ))}
        </>
      )}
    </Stack>
  );
};

export const MonitorFormColumn = memo(MonitorFormColumnComponent);
