import { Box, List, Typography } from '@mui/material';
import { ModelsInfoSchema, useGetAlertRulesApiV1AlertRulesGet } from 'api/generated';
import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { Loader } from './Loader';
import { ModelItem } from './ModelItem/ModelItem';
import { SearchField } from './SearchField';

interface ModelListProps {
  activeModelId: number | null;
  filterMonitors: Dispatch<SetStateAction<number | null>>;
  models: ModelsInfoSchema[];
}

export function ModelList({ activeModelId, filterMonitors, models }: ModelListProps) {
  const [filteredModels, setFilteredModels] = useState(models);
  const [modelName, setModelName] = useState<string>('');

  const { data: criticalAlerts = [], isLoading: isCriticalAlertsLoading } = useGetAlertRulesApiV1AlertRulesGet({
    severity: ['critical']
  });

  const clearSearchBar = () => {
    setModelName('');
    setFilteredModels(models);
  };

  const onReset = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    filterMonitors(null);
  };

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setModelName(value);
    if (!value) setFilteredModels(models);
    setFilteredModels(models.filter(({ name }) => name.toLowerCase().includes(value.toLowerCase())));
  };

  const alertsCount = useMemo(
    () =>
      models.reduce((acc, { id }) => {
        const currentAlert = criticalAlerts.find(alert => alert.model_id === id);
        if (currentAlert && currentAlert.alerts_count) {
          acc.push(currentAlert.alerts_count);
        } else {
          acc.push(0);
        }

        return acc;
      }, [] as number[]),
    [criticalAlerts, models]
  );

  const handleModelClick = (modelId: number) => {
    filterMonitors(modelId);
  };

  useEffect(() => {
    setFilteredModels(models);
  }, [models]);

  return (
    <Box
      sx={{
        boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
        borderRadius: '10px',
        borderLeft: '8px solid rgba(239, 76, 54, 0.5)',
        minHeight: '100%'
      }}
    >
      <Typography
        sx={{
          color: '#3A474E',
          fontWeight: 500,
          fontSize: 18,
          lineHeight: '160%',
          textAlign: 'left',
          paddingTop: '16px',
          paddingLeft: '12px',
          paddingBottom: '21px'
        }}
        variant="subtitle1"
      >
        Models List
      </Typography>
      <Box
        sx={{
          padding: '20px 30px 20px 22px'
        }}
      >
        <SearchField size="small" fullWidth onChange={onSearch} value={modelName} reset={clearSearchBar} />
      </Box>
      {isCriticalAlertsLoading ? (
        <Loader />
      ) : (
        <List sx={{ height: '370px', overflowY: 'auto' }}>
          {filteredModels.map((model, index) => (
            <ModelItem
              key={index}
              activeModel={activeModelId === model.id}
              alertsCount={alertsCount[index]}
              onModelClick={handleModelClick}
              onReset={onReset}
              model={model}
            />
          ))}
        </List>
      )}
    </Box>
  );
}
