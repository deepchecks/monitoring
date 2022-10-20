import React, { useState, useEffect } from 'react';

import { ModelManagmentSchema, deleteModelApiV1ModelsModelIdDelete } from 'api/generated';

import useHeader from 'hooks/useHeader';
import useModels from 'hooks/useModels';

import { Box, Menu, MenuItem, Stack, styled, TextField, Autocomplete, Typography } from '@mui/material';

import { Loader } from 'components/Loader';
import ModelInfoItem from 'components/ModelInfoItem/ModelInfoItem';
import NoResults from 'components/NoResults';
import FiltersResetButton from 'components/FiltersSort/FiltersResetButton';
import FiltersSortButton from 'components/FiltersSort/FiltersSortButton';

import { colors } from 'theme/colors';

import { sortOptionsVariants, sortOptions } from 'components/FiltersSort/FiltersSort';

const mapModelsNames = (models: ModelManagmentSchema[]) => models.map(m => m.name);

const filterModels = (models: ModelManagmentSchema[], searchInputValue: string, searchValue: string | null) =>
  models.filter(m => {
    if (searchValue) {
      return m.name === searchValue;
    }

    if (searchInputValue) {
      return m.name.toLocaleLowerCase().includes(searchInputValue.toLocaleLowerCase());
    }
  });

const sortModels = (models: ModelManagmentSchema[], sortMethod: sortOptionsVariants) =>
  [...models].sort((a, b) =>
    sortMethod === sortOptionsVariants.AZ ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

export const ModelsPage = () => {
  const { models, isLoading, refetchModels } = useModels();
  const { Header, setHeaderTitle } = useHeader();

  const [modelsList, setModelsList] = useState<ModelManagmentSchema[]>(models);
  const [filteredAndSortedModelsList, setFilteredAndSortedModelsList] = useState<ModelManagmentSchema[]>(models);
  const [modelNamesArray, setModelNamesArray] = useState<string[]>([]);

  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchValue, setSearchValue] = useState<string | null>(null);

  const [anchorElSortMenu, setAnchorElSortMenu] = useState<HTMLElement | null>(null);
  const [sort, setSort] = useState<sortOptionsVariants | ''>('');

  useEffect(() => {
    setHeaderTitle('Connected Models');

    return () => setHeaderTitle('');
  }, []);

  useEffect(() => {
    setModelsList(models);

    let temp: ModelManagmentSchema[] = [];

    if (sort) {
      temp = sortModels(models, sort);
    }

    const m = temp.length === 0 ? models : temp;

    if (searchInputValue) {
      setFilteredAndSortedModelsList(filterModels(m, searchInputValue, searchValue));
    } else {
      setFilteredAndSortedModelsList(m);
    }

    setModelNamesArray(mapModelsNames(m));
  }, [models]);

  useEffect(() => {
    if (!searchValue && !searchInputValue) {
      const m = sort ? sortModels(modelsList, sort) : modelsList;
      setFilteredAndSortedModelsList(m);
      return;
    }

    const filtered = filterModels(modelsList, searchInputValue, searchValue);

    if (sort) {
      const filteredAndSorted = sortModels(filtered, sort);
      setFilteredAndSortedModelsList(filteredAndSorted);
      return;
    }

    setFilteredAndSortedModelsList(filtered);
  }, [searchValue, searchInputValue]);

  const handleOpenSortMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElSortMenu(e.currentTarget);
  };

  const handleCloseSortMenu = () => {
    setAnchorElSortMenu(null);
  };

  const handleSort = (sortMethod: sortOptionsVariants) => {
    setSort(sortMethod);

    const sortedModels = sortModels(filteredAndSortedModelsList, sortMethod);
    setFilteredAndSortedModelsList(sortedModels);

    handleCloseSortMenu();
  };

  const handleDeleteModel = async (modelId: number) => {
    await deleteModelApiV1ModelsModelIdDelete(modelId);
    refetchModels();
  };

  const handleReset = () => {
    setModelsList(models);
    setFilteredAndSortedModelsList(models);
    setSearchValue(null);
    setSearchInputValue('');
    setSort('');
  };

  return (
    <Box>
      <Header />
      <StyledModelsContainer>
        <Stack direction="row" justifyContent="space-between">
          <Autocomplete
            freeSolo
            value={searchValue}
            onChange={(event, newValue: string | null) => {
              setSearchValue(newValue);
            }}
            inputValue={searchInputValue}
            onInputChange={(event, newInputValue) => {
              setSearchInputValue(newInputValue);
            }}
            options={modelNamesArray}
            sx={{ width: 300 }}
            renderInput={params => <StyledAutocompleteTextField {...params} label="Search..." />}
          />

          {searchInputValue || searchValue || sort ? (
            <Stack direction="row" spacing="11px">
              <FiltersResetButton handleReset={handleReset} isLoading={isLoading} />
              <FiltersSortButton handleOpenSortMenu={handleOpenSortMenu} isLoading={isLoading} />
            </Stack>
          ) : (
            <FiltersSortButton handleOpenSortMenu={handleOpenSortMenu} isLoading={isLoading} />
          )}

          <Menu
            anchorEl={anchorElSortMenu}
            open={Boolean(anchorElSortMenu)}
            onClose={handleCloseSortMenu}
            MenuListProps={{
              'aria-labelledby': 'basic-button'
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
          >
            {sortOptions.map(sortMethod => (
              <StyledSortMenuItem
                sort={sort}
                sortMethod={sortMethod}
                key={sortMethod}
                onClick={() => handleSort(sortMethod)}
              >
                <Typography variant="subtitle2">{sortMethod}</Typography>
              </StyledSortMenuItem>
            ))}
          </Menu>
        </Stack>

        <StyledModelsList>
          {isLoading ? (
            <Loader />
          ) : filteredAndSortedModelsList.length !== 0 ? (
            filteredAndSortedModelsList.map(model => (
              <ModelInfoItem key={model.id} model={model} onDelete={() => handleDeleteModel(model.id)} />
            ))
          ) : (
            <NoResults marginTop="168px" handleReset={handleReset} />
          )}
        </StyledModelsList>
      </StyledModelsContainer>
    </Box>
  );
};

const StyledModelsContainer = styled(Box)(({ theme }) => ({
  padding: '40px 0 ',
  width: '100%',
  [theme.breakpoints.down(1381)]: {
    marginLeft: '83px'
  }
}));

const StyledModelsList = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '20px',
  marginTop: '40px',
  padding: 0
});

interface StyledSortMenuItemProps {
  sort: string;
  sortMethod: sortOptionsVariants;
}

const StyledSortMenuItem = styled(MenuItem, {
  shouldForwardProp: prop => prop !== 'sort' && prop !== 'sortMethod'
})<StyledSortMenuItemProps>(({ sort, sortMethod }) => ({
  color: sort === sortMethod ? colors.primary.violet[400] : colors.neutral.darkText,
  py: '12px',
  pl: '12px'
}));

const StyledAutocompleteTextField = styled(TextField)(({ theme }) => ({
  '& .MuiAutocomplete-clearIndicator': {
    backgroundColor: theme.palette.text.disabled,

    '&:hover': {
      opacity: 0.5
    }
  }
}));
