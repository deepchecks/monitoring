import {
  alpha,
  Box,
  Button,
  Checkbox,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem
} from '@mui/material';
import { AnalysisContext } from 'context/analysis-context';
import React, { useContext, useState } from 'react';
import { SearchField } from 'components/SearchField';

interface CategoricalFilterProps {
  column: string;
  data: string[];
  onClose: () => void;
}

type FilterType = Record<string, Record<string, boolean>>;

export function CategoricalFilter({ column, data, onClose }: CategoricalFilterProps) {
  const { filters, setFilters } = useContext(AnalysisContext);
  const [currentFilters, setCurrentFilters] = useState<FilterType>({ ...filters } as FilterType);
  const checkFilter = (label: string) => {
    setCurrentFilters(prevFilters => {
      const currentColumn = { ...prevFilters[column] };
      currentColumn[label] = !currentColumn[label];
      return { ...prevFilters, [column]: currentColumn };
    });
  };

  const sortedData = data.sort()
  const [filteredData, setFilteredData] = useState(sortedData);
  const [searchValue, setSearchValue] = useState('');

  const onApply = () => {
    setFilters(currentFilters);
    onClose();
  };

  const handleReset = () => {
    setSearchValue('');
    setFilteredData(sortedData);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      setSearchValue(value);

      if (!value.trim()) {
        setFilteredData(sortedData);
        return;
      }

      setFilteredData(sortedData.filter(val => val.toLowerCase().includes(value.toLowerCase())));
  }

  return (
    <Box>
      <SearchField
        size="small"
        fullWidth
        placeholder="Search..."
        onChange={handleSearch}
        onReset={handleReset}
        value={searchValue}
        sx={{ padding: '10px 10px 4px 10px', fontSize: 14, lineHeight: '17px' }}
      />
      <List disablePadding sx={{ maxHeight: 250, overflow: 'auto' }}>
        {filteredData.map((label, index) => {
          const labelId = `${label}-${index}`;
          return (
            <MenuItem key={index} sx={{ padding: 0 }}>
              <ListItemButton
                role={undefined}
                onClick={() => checkFilter(label)}
                dense
                sx={theme => ({
                  minWidth: 220,
                  padding: '10px 12px',
                  '&:hover': { background: theme.palette.grey[100] }
                })}
              >
                <ListItemIcon
                  sx={{
                    '&.MuiListItemIcon-root': {
                      minWidth: '29px'
                    }
                  }}
                >
                  <Checkbox
                    edge="start"
                    checked={!!currentFilters[column][label]}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                    sx={{ ml: 0 }}
                  />
                </ListItemIcon>
                <ListItemText id={labelId} primary={label} sx={{ flexGrow: 0 }} />
              </ListItemButton>
            </MenuItem>
          );
        })}
      </List>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        padding="10px 0"
        borderTop={theme => `1px solid ${alpha(theme.palette.grey[200], 0.5)}`}
      >
        <Button onClick={onApply} variant="text">
          Apply
        </Button>
      </Box>
    </Box>
  );
}
