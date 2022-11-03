import React, { useEffect, useRef, useState } from 'react';
import { ColumnType, GetModelColumnsApiV1ModelsModelIdColumnsGet200 } from 'api/generated';

import { List, Popover, PopoverProps } from '@mui/material';

import { NestedMenu } from 'components/NestedMenu/NestedMenu';
import { SearchField } from 'components/SearchField';
import { CategoricalFilter } from './CategoricalFilter';
import { NumericFilter } from './NumericFilter';

import { WindowTimeout } from 'helpers/types/index';

interface DropDownFilterProps extends PopoverProps {
  columns: GetModelColumnsApiV1ModelsModelIdColumnsGet200;
  onClose: () => void;
}

export function DropDownFilter({ columns, onClose, ...props }: DropDownFilterProps) {
  const [currentColumns, setCurrentColumns] = useState(columns);
  const [searchColumnName, setSearchColumnName] = useState('');

  const searchTimer = useRef<WindowTimeout>();

  const filterColumns = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    clearTimeout(searchTimer.current);
    setSearchColumnName(value);

    if (!value.trim()) {
      setCurrentColumns(columns);
      return;
    }

    searchTimer.current = setTimeout(() => {
      const filteredColumns: GetModelColumnsApiV1ModelsModelIdColumnsGet200 = {};

      Object.entries(columns).forEach(([column, columnValue]) => {
        if (column.toLowerCase().includes(value.toLowerCase())) {
          filteredColumns[column] = columnValue;
        }
      });

      setCurrentColumns(filteredColumns);
    }, 200);
  };

  const handleReset = () => {
    setSearchColumnName('');
    setCurrentColumns(columns);
  };

  useEffect(() => {
    if (columns) {
      setCurrentColumns(columns);
      setSearchColumnName('');
    }
  }, [columns]);

  return (
    <Popover
      {...props}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left'
      }}
      sx={{
        '.MuiPopover-paper': {
          paddingBottom: '10px'
        }
      }}
    >
      <SearchField
        size="small"
        fullWidth
        placeholder="Search..."
        onChange={filterColumns}
        onReset={handleReset}
        value={searchColumnName}
        sx={{ padding: '10px 10px 4px 10px', fontSize: 14, lineHeight: '17px' }}
      />
      <List disablePadding sx={{ maxHeight: 300, overflow: 'auto' }}>
        {Object.entries(currentColumns).map(([column, value]) => (
          <NestedMenu key={column} label={column}>
            {value.type === ColumnType.categorical ? (
              <CategoricalFilter column={column} data={value?.stats?.values || []} onClose={onClose} />
            ) : (
              <NumericFilter data={value.stats} column={column} onClose={onClose} />
            )}
          </NestedMenu>
        ))}
      </List>
    </Popover>
  );
}
