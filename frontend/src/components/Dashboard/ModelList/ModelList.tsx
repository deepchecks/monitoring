import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';

import { ModelManagmentSchema, useGetAlertRulesApiV1AlertRulesGet } from 'api/generated';

import { Loader } from 'components/Loader';
import { ModelItem } from './ModelItem';
import { SearchField } from 'components/SearchField';

import { StyledContainer, StyledHeading, StyledList, StyledSearchFieldContainer } from './ModelList.style';

interface ModelListProps {
  activeModelId: number | null;
  filterMonitors: Dispatch<SetStateAction<number | null>>;
  models: ModelManagmentSchema[];
  isLoading?: boolean;
}

const SEVERITY = 'critical';

export function ModelList({ activeModelId, filterMonitors, models, isLoading }: ModelListProps) {
  const [filteredModels, setFilteredModels] = useState(models);
  const [modelName, setModelName] = useState('');

  const { data: criticalAlerts = [], isLoading: isCriticalAlertsLoading } = useGetAlertRulesApiV1AlertRulesGet({
    severity: [SEVERITY]
  });

  useEffect(() => {
    setFilteredModels(models);
  }, [models]);

  const onReset = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    filterMonitors(null);
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
    filterMonitors(modelId);
  };

  const alertsCountMap = useMemo(() => {
    const map: Record<number, number> = {};

    models.forEach(({ id }) => {
      const currentAlert = criticalAlerts.find(alert => alert.model_id === id);

      if (currentAlert && currentAlert.alerts_count) {
        map[id] = currentAlert.alerts_count;
      } else {
        map[id] = 0;
      }
    });

    return map;
  }, [criticalAlerts, models]);

  return (
    <StyledContainer>
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <StyledHeading variant="subtitle1">Models List</StyledHeading>
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
            </StyledList>
          )}
        </>
      )}
    </StyledContainer>
  );
}
