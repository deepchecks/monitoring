import React from 'react';

import { ModelManagmentSchema } from 'api/generated';

import { StyledInput } from 'components/lib';

import { useTableSearchfield } from 'helpers/hooks/useTableSearchfield';
import { constants } from '../modelsTab.constants';

interface ModelsTabHeaderProps {
  initialModels: ModelManagmentSchema[];
  setModelsList: React.Dispatch<React.SetStateAction<ModelManagmentSchema[]>>;
}

export const ModelsTabHeader = ({ initialModels, setModelsList }: ModelsTabHeaderProps) => {
  const { searchFieldValue, handleSearchFieldChange, resetSearchField } = useTableSearchfield<ModelManagmentSchema>(
    initialModels,
    setModelsList,
    'name'
  );

  return (
    <StyledInput
      placeholder={constants.searchFieldPlaceholder}
      value={searchFieldValue}
      onChange={handleSearchFieldChange}
      onCloseIconClick={resetSearchField}
      searchField
      fullWidth
      sx={{ marginBottom: '16px' }}
    />
  );
};
