import { alpha, Button, Divider, Stack } from '@mui/material';
import {
  GetModelColumnsApiV1ModelsModelIdColumnsGet200,
  ModelManagmentSchema,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet
} from 'api/generated';
import { FilterIcon } from 'assets/icon/icon';
import { ExpandableSelection } from 'components/ExpandableSelection';
import { SwitchButton } from 'components/SwitchButton';
import { AnalysisContext, ColumnsFilters } from 'Context/AnalysisContext';
import { timeMap } from 'helpers/timeValue';
import { ColumnType } from 'helpers/types/model';
import React, { useContext, useEffect, useState } from 'react';
import { DropDownFilter } from './components/DropDownFilter';

interface AnalysisFiltersProps {
  model: ModelManagmentSchema;
}

const defaultLookBack = [
  { label: 'Last 7 Days', value: timeMap.week },
  { label: 'Last 30 Days', value: timeMap.month }
];

export function AnalysisFilters({ model }: AnalysisFiltersProps) {
  const [lookback, setLookback] = useState(defaultLookBack[0].value);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const { setFilters } = useContext(AnalysisContext);

  const { data: columns = {} as GetModelColumnsApiV1ModelsModelIdColumnsGet200, refetch } =
    useGetModelColumnsApiV1ModelsModelIdColumnsGet(model.id, {
      query: {
        enabled: false
      }
    });

  const handleFiltersClose = () => {
    setAnchorEl(null);
  };

  const handleFiltersOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  useEffect(() => {
    if (model.id !== -1) {
      refetch();
    }
  }, [model]);

  useEffect(() => {
    if (Object.keys(columns).length) {
      const currentFilters: ColumnsFilters = {};
      Object.entries(columns).forEach(([key, value]) => {
        if (value.type === ColumnType.categorical) {
          if (value.stats.values) {
            const categories: Record<string, boolean> = {};
            value.stats.values.forEach(filter => {
              categories[filter] = false;
            });
            currentFilters[key] = categories;
            return;
          }
          currentFilters[key] = {};
        }
        if (value.type === ColumnType.numeric) {
          currentFilters[key] = null;
        }
      });
      setFilters(currentFilters);
    }
  }, [columns]);

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" alignItems="center">
          <ExpandableSelection
            label="Look Back Window"
            changeState={setLookback}
            data={defaultLookBack}
            value={lookback}
            endTime={model.latest_time}
          />
          <SwitchButton />
          <Divider
            orientation="vertical"
            flexItem
            sx={{ margin: '0 14px', borderColor: theme => alpha(theme.palette.grey[200], 0.5) }}
          />
          <Button
            startIcon={<FilterIcon />}
            variant="text"
            onClick={handleFiltersOpen}
            sx={{
              padding: '5px 10px',
              '& .MuiButton-startIcon': {
                marginRight: '4px'
              }
            }}
          >
            Filter
          </Button>
        </Stack>
      </Stack>
      <DropDownFilter anchorEl={anchorEl} columns={columns} open={!!anchorEl} onClose={handleFiltersClose} />
    </>
  );
}
