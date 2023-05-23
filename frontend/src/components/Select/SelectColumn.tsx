import React, { useMemo, memo } from 'react';

import { useGetModelColumnsApiV1ModelsModelIdColumnsGet } from 'api/generated';

import { Stack, MenuItem, SelectChangeEvent } from '@mui/material';

import { MarkedSelect } from 'components/MarkedSelect';
import { ControlledMarkedSelect } from 'components/MarkedSelect/ControlledMarkedSelect';
import { Subcategory } from 'components/Subcategory';
import { RangePicker } from 'components/RangePicker/RangePicker';

import { ColumnType } from 'helpers/types/model';
import { SetStateType, SelectValues } from 'helpers/types';

interface SelectColumnProps {
  model: SelectValues;
  column: string | undefined;
  setColumn: SetStateType<string | undefined>;
  category: SelectValues;
  setCategory: SetStateType<SelectValues>;
  numericValue: number[] | undefined;
  setNumericValue: SetStateType<number[] | undefined>;
  size?: 'small' | 'medium';
}

const SelectColumnComponent = ({
  model = '',
  column,
  setColumn,
  category,
  setCategory,
  numericValue,
  setNumericValue,
  size = 'small'
}: SelectColumnProps) => {
  const { data: columnsMap = {}, isLoading } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(model);
  const columns = useMemo(
    () => Object.fromEntries(Object.entries(columnsMap).filter(([, value]) => value.type in ColumnType)),
    [columnsMap]
  );
  const disabled = useMemo(() => !model || !columns || isLoading, [model, columns, isLoading]);

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
      <MarkedSelect
        label={'Filter by segment'}
        value={column}
        onChange={handleColumnChange}
        clearValue={() => {
          setColumn('');
          resetSubcategory();
        }}
        disabled={disabled}
        size={size}
      >
        {Object.keys(columns).map(col => (
          <MenuItem key={col} value={col}>
            {col}
          </MenuItem>
        ))}
      </MarkedSelect>
      {column &&
        !disabled &&
        (columns[column].type === ColumnType.categorical ? (
          <Subcategory>
            <ControlledMarkedSelect
              label="Select category"
              values={columns[column].stats.values || []}
              value={category}
              setValue={setCategory}
              clearValue={() => setCategory('')}
              size={size}
            />
          </Subcategory>
        ) : (
          numericValue && (
            <RangePicker
              sx={{ width: '90%', margin: '16px auto 0', ' .css-3ikqqr-MuiStack-root': { display: 'none' } }}
              min={columns[column].stats.min || 0}
              max={columns[column].stats.max || 0}
              numericValue={numericValue}
              setNumericValue={setNumericValue}
            />
          )
        ))}
    </Stack>
  );
};

export const SelectColumn = memo(SelectColumnComponent);
