import { Box, Button, List, Typography } from '@mui/material';
import { ModelsInfoSchema, useGetAlertRulesApiV1AlertRulesGet } from 'api/generated';
import React, { useEffect, useState } from 'react';
import { Loader } from './Loader';
import { ModelItem } from './ModelItem/ModelItem';
import { SearchField } from './SearchField';

interface ModelListProps {
  models: ModelsInfoSchema[];
}

const initRange = 3;

export function ModelList({ models }: ModelListProps) {
  const [range, setRange] = useState<number>(initRange);

  const [filteredModels, setFilteredModels] = useState(models);

  const { data: criticalAlerts = [], isLoading: isCriticalAlertsLoading } = useGetAlertRulesApiV1AlertRulesGet({
    severity: ['critical']
  });

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (!value) setFilteredModels(models);
    setFilteredModels(models.filter(({ name }) => name.toLowerCase().includes(value.toLowerCase())));
  };

  const handleRange = () => {
    setRange(prevRange => {
      const currentRange = prevRange + initRange;

      if (currentRange < filteredModels.length) {
        return currentRange;
      }

      return filteredModels.length;
    });
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
        <SearchField size="small" fullWidth onChange={onSearch} />
      </Box>
      {isCriticalAlertsLoading ? (
        <Loader />
      ) : (
        <List sx={{ height: '370px', overflowY: 'auto' }}>
          {filteredModels.slice(0, range).map((model, index) => (
            <ModelItem
              key={index}
              alertsCount={criticalAlerts.reduce((acc, alert) => {
                let currentAlertCount = acc;
                if (alert.model_id === model.id && alert.alerts_count) {
                  currentAlertCount = alert.alerts_count;
                }

                return currentAlertCount;
              }, 0)}
              model={model}
            />
          ))}
          {range < filteredModels.length && (
            <Button
              sx={{
                padding: '8px',
                borderRadius: '4px',
                marginLeft: '30px'
              }}
              variant="text"
              onClick={handleRange}
            >
              See all (+{filteredModels.length - range})
            </Button>
          )}
        </List>
      )}
    </Box>
  );
}
