import React, { useContext, useEffect, useMemo, useCallback, useRef, useState } from 'react';

import { AnalysisContext, FilterValue } from 'context/analysis-context';

import { Box, Popover, Stack, Tooltip } from '@mui/material';

import { ColumnChip } from './components/ColumnChip';

const maxCharacters = 100;
const initCounterWidth = 50;

export function ActiveColumnsFilters() {
  const { filters, setFilters } = useContext(AnalysisContext);

  const [menuFilterRange, setMenuFilterRange] = useState(0);
  const [counterWidth, setCounterWidth] = useState(initCounterWidth);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMenuOpen = () => {
    setAnchorEl(containerRef.current);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const deleteFilter = useCallback(
    (column: string, value: FilterValue, category = '') =>
      () => {
        if (value) {
          setFilters(prevFilters => {
            if (Array.isArray(value)) {
              return { ...prevFilters, [column]: null };
            }

            return { ...prevFilters, [column]: { ...prevFilters[column], [category]: false } };
          });
        }
      },
    [setFilters]
  );

  useEffect(() => {
    if (containerRef.current && containerRef.current.clientWidth !== containerRef.current.scrollWidth) {
      let width = containerRef.current.clientWidth - initCounterWidth;
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

    setCounterWidth(initCounterWidth);
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
                label={`${key}: ${Number.isInteger(value[0]) ? value[0] : value[0].toFixed(3)} <> ${
                  Number.isInteger(value[1]) ? value[1] : value[1].toFixed(3)
                }`}
                onDelete={deleteFilter(key, value)}
              />
            );
          }

          const values = Object.keys(value);

          if (!Array.isArray(value) && values.length) {
            return values.map(label => {
              if (value[label]) {
                return label.length > maxCharacters ? (
                  <Tooltip title={label} placement="top">
                    <ColumnChip
                      key={`${key}${label}`}
                      label={`${key}: ${label.slice(0, maxCharacters)}...`}
                      onDelete={deleteFilter(key, value, label)}
                    />
                  </Tooltip>
                ) : (
                  <ColumnChip
                    key={`${key}${label}`}
                    label={`${key}: ${label}`}
                    onDelete={deleteFilter(key, value, label)}
                  />
                );
              }
              return null;
            });
          }
        }
      }),
    [filters, deleteFilter]
  );

  return (
    <>
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
    </>
  );
}
