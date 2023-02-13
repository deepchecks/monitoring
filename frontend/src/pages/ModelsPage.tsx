import React, { useState, useEffect } from 'react';

import {
  deleteModelApiV1ModelsModelIdDelete,
  useRetrieveConnectedModelsApiV1ConnectedModelsGet,
  ConnectedModelSchema
} from 'api/generated';

import {
  Box,
  Menu,
  MenuItem,
  Stack,
  styled,
  TextField,
  Autocomplete,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';

import HeaderLayout from 'components/HeaderLayout';
import { Loader } from 'components/Loader';
import { ModelInfoItem } from '../components/ModelInfoItem';
import NoResults from 'components/NoResults';
import FiltersResetButton from 'components/FiltersSort/components/FiltersResetButton';
import FiltersSortButton from 'components/FiltersSort/components/FiltersSortButton';

import { colors } from 'theme/colors';

import { sortOptionsVariants, sortOptions } from 'components/FiltersSort/FiltersSort';
import { getParams, setParams } from 'helpers/utils/getParams';

const mapModelsNames = (models: ConnectedModelSchema[]) => models.map(m => m.name);

const filterModels = (models: ConnectedModelSchema[], searchInputValue: string, searchValue: string | null) =>
  models.filter(m => {
    if (searchValue) {
      return m.name === searchValue;
    }

    if (searchInputValue) {
      return m.name.toLocaleLowerCase().includes(searchInputValue.toLocaleLowerCase());
    }
  });

const sortModels = (models: ConnectedModelSchema[], sortMethod: sortOptionsVariants) =>
  [...models].sort((a, b) =>
    sortMethod === sortOptionsVariants.AZ ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

export const ModelsPage = () => {
  const { data: models, isLoading, refetch: refetchModels } = useRetrieveConnectedModelsApiV1ConnectedModelsGet();
  const [modelsList, setModelsList] = useState<ConnectedModelSchema[] | undefined>(models);
  const [filteredAndSortedModelsList, setFilteredAndSortedModelsList] = useState<ConnectedModelSchema[] | undefined>(
    models
  );
  const [modelNamesArray, setModelNamesArray] = useState<string[]>([]);
  const [modelIdToDelete, setModelIdToDelete] = useState<number | null>(null);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchValue, setSearchValue] = useState<string | null>(null);

  const [anchorElSortMenu, setAnchorElSortMenu] = useState<HTMLElement | null>(null);
  const [sort, setSort] = useState<sortOptionsVariants | ''>('');

  useEffect(() => {
    const paramModelId = +getParams()?.modelId;
    if (paramModelId) {
      const model = models?.filter(val => val.id == paramModelId)?.[0];
      model && setSearchValue(model.name);
    }
  }, [models]);

  useEffect(() => {
    if (!models) {
      return;
    }

    setModelsList(models);

    let temp: ConnectedModelSchema[] = [];

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
  }, [models, searchInputValue, searchValue, sort]);

  useEffect(() => {
    if (!modelsList) {
      return;
    }

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
  }, [searchValue, searchInputValue, modelsList, sort]);

  const handleOpenSortMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElSortMenu(e.currentTarget);
  };

  const handleCloseSortMenu = () => {
    setAnchorElSortMenu(null);
  };

  const handleSort = (sortMethod: sortOptionsVariants) => {
    setSort(sortMethod);

    const sortedModels = filteredAndSortedModelsList ? sortModels(filteredAndSortedModelsList, sortMethod) : undefined;
    setFilteredAndSortedModelsList(sortedModels);

    handleCloseSortMenu();
  };

  const handleDeleteModel = async () => {
    if (modelIdToDelete) {
      await deleteModelApiV1ModelsModelIdDelete(modelIdToDelete);
      await refetchModels();
      handleModalClose();
    }
  };

  const handleModalClose = () => {
    setModelIdToDelete(null);
  };

  const handleOpenModal = (modelId: number) => {
    setModelIdToDelete(modelId);
  };

  const handleReset = () => {
    setModelsList(models);
    setFilteredAndSortedModelsList(models);
    setSearchValue(null);
    setParams('modelId');
    setSearchInputValue('');
    setSort('');
  };

  const updateSearch = (_e: React.SyntheticEvent<Element, Event>, newValue: string | null) => {
    setSearchValue(newValue);
    const model = models?.filter(val => val.name == newValue)?.[0];
    if (model) {
      setParams('modelId', model.id);
    } else {
      setParams('modelId');
    }
  };

  return (
    <>
      <Box>
        <HeaderLayout title="Connected Models" />
        <StyledModelsContainer>
          <Stack direction="row" justifyContent="space-between">
            <Autocomplete
              freeSolo
              value={searchValue}
              onChange={updateSearch}
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
            {isLoading || !filteredAndSortedModelsList ? (
              <Loader />
            ) : filteredAndSortedModelsList.length !== 0 ? (
              filteredAndSortedModelsList.map(model => (
                <ModelInfoItem key={model.id} model={model} onDelete={async () => handleOpenModal(model.id)} />
              ))
            ) : (
              <NoResults marginTop="168px" handleReset={handleReset} />
            )}
          </StyledModelsList>
        </StyledModelsContainer>
      </Box>

      <Dialog open={modelIdToDelete !== null} onClose={handleModalClose}>
        <Box>
          <DialogTitle>{'Delete Model'}</DialogTitle>
          <DialogContent>
            <DialogContentText>Are you sure you want to delete this model?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleModalClose} autoFocus>
              No
            </Button>
            <Button onClick={handleDeleteModel} variant="outlined">
              Yes
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

const StyledModelsContainer = styled(Box)(() => ({
  padding: '40px 0 ',
  width: '100%'
}));

const StyledModelsList = styled(Box)({
  display: 'grid',
  'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
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
      backgroundColor: theme.palette.text.disabled,
      opacity: 0.5
    }
  }
}));

export default ModelsPage;
