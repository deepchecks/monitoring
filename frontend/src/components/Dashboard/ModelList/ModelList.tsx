import React, { useContext, useMemo, useState } from 'react';

import { ModelManagmentSchema, useGetAlertRulesApiV1AlertRulesGet } from 'api/generated';
import { GlobalStateContext } from 'context';

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

interface ModelListProps {
  models: ModelManagmentSchema[];
  isLoading?: boolean;
}

const SEVERITY = 'critical';

export function ModelList({ models, isLoading }: ModelListProps) {
  const { selectedModelId: activeModelId, changeSelectedModelId } = useContext(GlobalStateContext);

  const [filteredModels, setFilteredModels] = useState(models);
  const [modelName, setModelName] = useState('');

  const { data: criticalAlerts = [], isLoading: isCriticalAlertsLoading } = useGetAlertRulesApiV1AlertRulesGet({
    severity: [SEVERITY]
  });

  const onReset = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    changeSelectedModelId(null);
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    setModelName(value);
    if (!value) setFilteredModels(models);

    const filtered = models.filter(({ name }) => name.toLowerCase().includes(value.toLowerCase()));
    setFilteredModels(filtered);
  };

  const clearSearchBar = () => {
    setModelName('');
    setFilteredModels(models);
  };

  const handleModelClick = (modelId: number) => {
    changeSelectedModelId(modelId);
  };

  const alertsCountMap = useMemo(() => {
    const map: Record<number, number> = {};

    models.forEach(({ id }) => {
      const currentAlert = criticalAlerts.find(alert => alert.model_id === id);
      currentAlert && currentAlert.alerts_count ? (map[id] = currentAlert.alerts_count) : (map[id] = 0);
    });

    return map;
  }, [criticalAlerts, models]);

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
            <SearchField size="small" fullWidth onChange={onSearch} value={modelName} onReset={clearSearchBar} />
          </StyledSearchFieldContainer>
          {isCriticalAlertsLoading ? (
            <Loader />
          ) : (
            <StyledList>
              {filteredModels.map((model, index) => (
                <ModelItem
                  key={index}
                  activeModel={activeModelId === model.id}
                  alertsCount={alertsCountMap[model.id]}
                  onModelClick={handleModelClick}
                  onReset={onReset}
                  model={model}
                  severity={SEVERITY}
                />
              ))}
              {activeModelId && (
                <StyledResetSelectionContainer>
                  <StyledResetSelectionContent onClick={onReset}>
                    <Rotate />
                    <StyledResetSelectionText>Reset selection</StyledResetSelectionText>
                  </StyledResetSelectionContent>
                </StyledResetSelectionContainer>
              )}
            </StyledList>
          )}
        </>
      )}
    </StyledContainer>
  );
}
