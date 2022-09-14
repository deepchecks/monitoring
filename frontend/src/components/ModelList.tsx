import React, { useEffect } from 'react';
import { List, Box, Button, Typography } from '@mui/material';
import { useState } from 'react';
import { SearchField } from './SearchField';
import { ModelItem } from './ModelItem/ModelItem';
import { ModelsInfoSchema } from 'api/generated';

interface ModelListProps {
  models: ModelsInfoSchema[];
}

const initRange = 3;

export function ModelList({ models }: ModelListProps) {
  const [range, setRange] = useState<number>(initRange);

  const [filteredModels, setFilteredModels] = useState(models);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (!value) setFilteredModels(models);
    setFilteredModels(models.filter(({ name }) => name.includes(value)));
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
        borderLeft: '8px solid rgba(239, 76, 54, 0.5)'
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
      <List sx={{ height: '370px', overflowY: 'auto' }}>
        {filteredModels.slice(0, range).map((model, index) => (
          <ModelItem key={index} model={model} />
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
    </Box>
  );
}
