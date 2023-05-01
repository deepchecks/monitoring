import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ColumnType, GetModelColumnsApiV1ModelsModelIdColumnsGet200 } from 'api/generated';

import { List, Popover, PopoverProps, Box, styled } from '@mui/material';

import { NestedMenu } from 'components/NestedMenu';
import { SearchField } from 'components/base/Input/SearchField';
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

  const filterColumns = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [columns]
  );

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
    <StyledPopover
      {...props}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left'
      }}
    >
      <StyledSearchFieldContainer>
        <SearchField
          size="small"
          fullWidth
          placeholder="Search..."
          onChange={filterColumns}
          onReset={handleReset}
          value={searchColumnName}
        />
      </StyledSearchFieldContainer>

      <StyledList disablePadding>
        {Object.entries(currentColumns).map(([column, value]) => (
          <NestedMenu key={column} label={column}>
            {value.type === ColumnType.categorical ? (
              <CategoricalFilter column={column} data={value?.stats?.values || []} onClose={onClose} />
            ) : (
              <NumericFilter data={value.stats} column={column} onClose={onClose} />
            )}
          </NestedMenu>
        ))}
      </StyledList>
    </StyledPopover>
  );
}

const StyledPopover = styled(Popover)({
  '.MuiPopover-paper': {
    marginTop: '5px',
    boxShadow: '2px 2px 30px -10px rgba(41, 53, 67, 0.25)',
    borderRadius: '10px'
  }
});

const StyledSearchFieldContainer = styled(Box)({
  padding: '10px 10px 4px 10px'
});

const StyledList = styled(List)({
  maxHeight: '300px',
  overflow: 'auto'
});
