import React, { useContext, useState } from 'react';

import { AnalysisContext } from 'helpers/context/AnalysisProvider';

import {
  Box,
  Button,
  Checkbox,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  styled
} from '@mui/material';

import { SearchField } from 'components/base/Input/SearchField';

import { theme } from 'components/lib/theme';

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

  const sortedData = data.sort();
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
  };

  return (
    <>
      <StyledSearchFieldContainer>
        <SearchField
          size="small"
          fullWidth
          placeholder="Search..."
          onChange={handleSearch}
          onReset={handleReset}
          value={searchValue}
        />
      </StyledSearchFieldContainer>
      <StyledList disablePadding>
        {filteredData.map((label, index) => {
          const labelId = `${label}-${index}`;
          return (
            <MenuItem key={index} sx={{ padding: 0 }}>
              <StyledListItemButton role={undefined} onClick={() => checkFilter(label)} dense>
                <StyledListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={!!currentFilters[column][label]}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                    sx={{ ml: 0 }}
                  />
                </StyledListItemIcon>
                <ListItemText id={labelId} primary={label} sx={{ flexGrow: 0 }} />
              </StyledListItemButton>
            </MenuItem>
          );
        })}
      </StyledList>
      <StyledButtonContainer>
        <Button onClick={onApply} variant="text">
          Apply
        </Button>
      </StyledButtonContainer>
    </>
  );
}

const StyledSearchFieldContainer = styled(Box)({
  padding: '10px 10px 4px 10px'
});

const StyledList = styled(List)({
  maxHeight: '250px',
  overflow: 'auto'
});

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  minWidth: '220px',
  padding: '10px 12px',
  '&:hover': { background: theme.palette.grey[100] }
}));

const StyledListItemIcon = styled(ListItemIcon)({
  '&.MuiListItemIcon-root': {
    minWidth: '29px'
  }
});

const StyledButtonContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5px 0',
  borderTop: `1px solid ${theme.palette.grey.light}`
});
