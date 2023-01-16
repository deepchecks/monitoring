import React, { useContext, useEffect, useMemo, useCallback, useRef, useState } from 'react';

import { AnalysisContext, FilterValue } from 'context/analysis-context';

import { Box, Popover, Stack, Tooltip } from '@mui/material';

import { ColumnChip } from './ColumnChip';

const MAX_CHARACTERS = 60;
const INIT_COUNTER_WIDTH = 50;

export function ActiveColumnsFilters() {
  const { filters, setFilters } = useContext(AnalysisContext);

  const [menuFilterRange, setMenuFilterRange] = useState(0);
  const [counterWidth, setCounterWidth] = useState(INIT_COUNTER_WIDTH);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMenuOpen = () => {
    setAnchorEl(containerRef.current);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const deleteFilter = useCallback(
    (column: string, value: FilterValue) => () => {
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

  useEffect(() => {
    if (containerRef.current && containerRef.current.clientWidth !== containerRef.current.scrollWidth) {
      let width = containerRef.current.clientWidth - INIT_COUNTER_WIDTH;
      const margin = 10;

      let numberOfVisibleElements = 0;

      for (let i = 0; i < containerRef?.current?.children.length; i++) {
        const element = containerRef?.current?.children[i];

        if (width - element.clientWidth + margin > 0) {
          width -= element.clientWidth;
          numberOfVisibleElements++;
        } else {
          setCounterWidth(width + margin);
          break;
        }
      }

      if (numberOfVisibleElements !== Object.keys(filters).length) {
        setMenuFilterRange(Object.keys(filters).length - numberOfVisibleElements - 1);
      }

      return;
    }

    setCounterWidth(INIT_COUNTER_WIDTH);
    setMenuFilterRange(0);
  }, [filters, containerRef?.current?.children, containerRef?.current?.children?.length]);

  const Filters = useMemo(
    () =>
      Object.entries(filters).map(([key, value]) => {
        if (value) {
          if (typeof value[0] === 'number' && typeof value[1] === 'number') {
            return (
              <ColumnChip
                key={`${key}${value[0]}${value[1]}`}
                label={`${key}: ${Number.isInteger(value[0]) ? value[0] : value[0].toFixed(3)} - ${
                  Number.isInteger(value[1]) ? value[1] : value[1].toFixed(3)
                }`}
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
                <Tooltip title={labelsString} placement="top">
                  <Box sx={{ height: '28px' }}>
                    <ColumnChip
                      key={`${key}${labelsString}`}
                      label={`${key}: ${labelsString.slice(0, MAX_CHARACTERS)}...`}
                      onDelete={deleteFilter(key, value)}
                    />
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

  return (
    <Stack
      direction="row"
      height="70px"
      spacing="10px"
      ref={containerRef}
      sx={{ overflow: 'hidden', position: 'relative' }}
    >
      {Filters}
      {!!menuFilterRange && (
        <>
          <Box
            sx={{
              position: 'absolute',
              height: 1,
              bottom: 0,
              right: 0,
              background: theme => theme.palette.common.white,
              width: counterWidth,
              display: 'flex',
              justifyContent: 'end',
              alignItems: 'center'
            }}
          >
            <ColumnChip label={`+${menuFilterRange}`} onClick={handleMenuOpen} />
          </Box>
          <Popover
            anchorEl={anchorEl}
            open={!!anchorEl}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
          >
            <Stack sx={{ padding: '16px 16px 20px' }} spacing="20px">
              {Filters.slice(-menuFilterRange)}
            </Stack>
          </Popover>
        </>
      )}
    </Stack>
  );
}
