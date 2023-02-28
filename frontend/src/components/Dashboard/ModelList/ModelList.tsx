import React, { useMemo, useState } from 'react';

import useModels from 'hooks/useModels';

import { Loader } from 'components/Loader';
import { ModelItem } from './components/ModelItem';
import { SearchField } from 'components/SearchField';
import { AlertsCountWidget } from './components/AlertsCountWidget';

import {
  StyledContainer,
  StyledHeading,
  StyledHeadingContainer,
  StyledList,
  StyledSearchFieldContainer,
  StyledResetSelectionContainer,
  StyledResetSelectionText,
  StyledResetSelectionContent
} from './ModelList.style';

import { Rotate } from 'assets/icon/icon';
import { setParams } from 'helpers/utils/getParams';

interface ModelListProps {
  setSelectedModelId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedModelId: number | null;
}

export function ModelList({ selectedModelId, setSelectedModelId }: ModelListProps) {
  const { models, isLoading } = useModels();

  const [modelName, setModelName] = useState('');

  const filteredModels = useMemo(() => {
    if (!modelName) return models;

    return models.filter(({ name }) => name.toLowerCase().includes(modelName.toLowerCase()));
  }, [models, modelName]);

  const onReset = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setSelectedModelId(null);
    setParams('modelId');
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    setModelName(value);
  };

  const clearSearchBar = () => {
    setModelName('');
  };

  const handleModelClick = (modelId: number) => {
    setSelectedModelId(modelId);
    setParams('modelId', modelId);
  };

  return (
    <StyledContainer>
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <StyledHeadingContainer>
            <StyledHeading variant="subtitle1">Models</StyledHeading>
            <AlertsCountWidget />
          </StyledHeadingContainer>
          <StyledSearchFieldContainer>
            <SearchField
              size="small"
              fullWidth
              onChange={onSearch}
              value={modelName}
              onReset={clearSearchBar}
              placeholder="Search Model..."
            />
          </StyledSearchFieldContainer>
          <StyledList>
            {filteredModels.map((model, index) => (
              <ModelItem
                key={index}
                activeModel={selectedModelId === model.id}
                onModelClick={handleModelClick}
                onReset={onReset}
                model={model}
              />
            ))}
            {selectedModelId && (
              <StyledResetSelectionContainer>
                <StyledResetSelectionContent onClick={onReset}>
                  <Rotate />
                  <StyledResetSelectionText>Reset selection</StyledResetSelectionText>
                </StyledResetSelectionContent>
              </StyledResetSelectionContainer>
            )}
          </StyledList>
        </>
      )}
    </StyledContainer>
  );
}
