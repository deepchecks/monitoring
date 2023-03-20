import React, { useMemo, useState } from 'react';

import {
  ModelManagmentSchema,
  AlertSeverity,
  useRetrieveConnectedModelsApiV1ConnectedModelsGet,
  ConnectedModelSchema
} from 'api/generated';

import { Loader } from 'components/Loader';
import { ModelItem } from './components/ModelItem';
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
import { StyledTextInput } from 'components/base/Input/Input.styles';

import { CloseIcon, Rotate, SearchIcon } from 'assets/icon/icon';

import { setParams } from 'helpers/utils/getParams';
import useModels from 'helpers/hooks/useModels';
import { constants } from '../dashboard.constants';

export type SelectedModelAlerts = { [key in AlertSeverity]: number };

interface ModelListProps {
  setSelectedModelId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedModelId: number | null;
}

const ZERO_ALERTS = { low: 0, mid: 0, high: 0, critical: 0 };
const { heading, reset, searchFieldPlaceholder } = constants.modelList;

export function ModelList({ selectedModelId, setSelectedModelId }: ModelListProps) {
  const { models, isLoading } = useModels();

  const { data: connectedModels = [] } = useRetrieveConnectedModelsApiV1ConnectedModelsGet();
  const connectedModelsMap = useMemo(() => {
    const map: Record<string, ConnectedModelSchema> = {};
    connectedModels.forEach(model => (map[model.id] = model));
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
    setParams('modelId');
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
    setParams('modelId', model.id);
    setSelectedModelAlerts(
      model.max_severity ? { ...ZERO_ALERTS, [model.max_severity]: model.alerts_count } : ZERO_ALERTS
    );
  };

  return (
    <StyledContainer>
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <StyledHeadingContainer>
            <StyledHeading variant="subtitle1">{heading}</StyledHeading>
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
    </StyledContainer>
  );
}
