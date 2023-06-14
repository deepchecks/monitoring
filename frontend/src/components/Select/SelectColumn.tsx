import React, { useMemo, memo } from 'react';

import { useGetModelColumnsApiV1ModelsModelIdColumnsGet } from 'api/generated';

import { Stack, MenuItem, SelectChangeEvent } from '@mui/material';

import { BaseDropdown } from 'components/base/InputDropdown/InputDropdown';
import { ControlledBaseDropdown } from 'components/base/InputDropdown/ControlledBaseDropdown';
import { Subcategory } from 'components/Subcategory';
import { RangePicker } from 'components/base/RangePicker/RangePicker';

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
}

const SelectColumnComponent = ({
  model = '',
  column,
  setColumn,
  category,
  setCategory,
  numericValue,
  setNumericValue
}: SelectColumnProps) => {
  const { data: columnsMap = {}, isLoading } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(model);
  const columns = useMemo(
    () => Object.fromEntries(Object.entries(columnsMap).filter(([, value]) => value.type in ColumnType)),
    [columnsMap]
  );
  const disabled = !model || !columns || isLoading;

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
      <BaseDropdown
        label="Filter by segment"
        value={column}
        onChange={handleColumnChange}
        clearValue={() => {
          setColumn('');
          resetSubcategory();
        }}
        disabled={disabled}
      >
        {Object.keys(columns).map(col => (
          <MenuItem key={col} value={col}>
            {col}
          </MenuItem>
        ))}
      </BaseDropdown>
      {column &&
        !disabled &&
        (columns[column].type === ColumnType.categorical ? (
          <Subcategory>
            <ControlledBaseDropdown
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
              disableInputs
              sx={{ width: '90%', margin: '16px auto 0' }}
            />
          )
        ))}
    </Stack>
  );
};

export const SelectColumn = memo(SelectColumnComponent);
