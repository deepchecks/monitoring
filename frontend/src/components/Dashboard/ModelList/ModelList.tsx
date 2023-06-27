import React, { useMemo, useState } from 'react';

import {
  ModelManagmentSchema,
  AlertSeverity,
  useRetrieveConnectedModelsApiV1ConnectedModelsGet,
  ConnectedModelSchema
} from 'api/generated';

import { Loader } from 'components/base/Loader/Loader';
import { ModelItem } from './components/ModelItem';
import { AlertsCountWidget } from './components/AlertsCountWidget';

import {
  StyledModelListContainer,
  StyledHeadingContainer,
  StyledList,
  StyledSearchFieldContainer,
  StyledResetSelectionContainer,
  StyledResetSelectionText,
  StyledResetSelectionContent
} from './ModelList.style';
import { StyledTextInput } from 'components/base/Input/Input.styles';

import { CloseIcon, Rotate, SearchIcon } from 'assets/icon/icon';

import { handleSetParams } from 'helpers/utils/getParams';
import useModels from 'helpers/hooks/useModels';
import { constants } from '../dashboard.constants';
import { StyledText } from 'components/lib';

export type SelectedModelAlerts = { [key in AlertSeverity]: number };

interface ModelListProps {
  setSelectedModelId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedModelId: number | null;
}

const ZERO_ALERTS = { low: 0, medium: 0, high: 0, critical: 0 };
const { heading, reset, searchFieldPlaceholder } = constants.modelList;

export function ModelList({ selectedModelId, setSelectedModelId }: ModelListProps) {
  const { models, isLoading } = useModels();

  const { data: connectedModels } = useRetrieveConnectedModelsApiV1ConnectedModelsGet({
    query: {
      refetchOnWindowFocus: false
    }
  });

  const connectedModelsMap = useMemo(() => {
    const map: Record<string, ConnectedModelSchema> = {};
    (Array.isArray(connectedModels) ? connectedModels : []).forEach(model => (map[model.id] = model));
    return map;
  }, [connectedModels]);

  const [modelName, setModelName] = useState('');
  const [selectedModelAlerts, setSelectedModelAlerts] = useState<SelectedModelAlerts | null>(null);

  const filteredModels = useMemo(() => {
    if (!modelName) return models;

    return models.filter(({ name }) => name.toLowerCase().includes(modelName.toLowerCase()));
  }, [models, modelName]);

  const onReset = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setSelectedModelId(null);
    handleSetParams('modelId');
    setSelectedModelAlerts(null);
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    setModelName(value);
  };

  const clearSearchBar = () => {
    setModelName('');
  };

  const handleModelClick = (model: ModelManagmentSchema) => {
    setSelectedModelId(model.id);
    handleSetParams('modelId', model.id);
    setSelectedModelAlerts(
      model.max_severity ? { ...ZERO_ALERTS, [model.max_severity]: model.alerts_count } : ZERO_ALERTS
    );
  };

  return (
    <StyledModelListContainer>
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <StyledHeadingContainer>
            <StyledText type="h1" text={heading} />
            <AlertsCountWidget selectedModelAlerts={selectedModelAlerts} />
          </StyledHeadingContainer>
          <StyledSearchFieldContainer>
            <StyledTextInput
              onChange={onSearch}
              value={modelName}
              placeholder={searchFieldPlaceholder}
              startAdornment={<SearchIcon />}
              endAdornment={modelName && <CloseIcon onClick={clearSearchBar} cursor="pointer" />}
              disableUnderline
            />
          </StyledSearchFieldContainer>
          <StyledList>
            {filteredModels.map((model, index) => (
              <ModelItem
                key={index}
                activeModel={selectedModelId === model.id}
                onModelClick={handleModelClick}
                model={model}
                connectedModelsMap={connectedModelsMap}
              />
            ))}
            {selectedModelId && (
              <StyledResetSelectionContainer>
                <StyledResetSelectionContent onClick={onReset}>
                  <Rotate />
                  <StyledResetSelectionText>{reset}</StyledResetSelectionText>
                </StyledResetSelectionContent>
              </StyledResetSelectionContainer>
            )}
          </StyledList>
        </>
      )}
    </StyledModelListContainer>
  );
}
