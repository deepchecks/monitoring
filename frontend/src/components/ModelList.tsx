import React from 'react';
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

  const handleRange = () => {
    setRange(prevRange => {
      const currentRange = prevRange + initRange;

      if (currentRange < models.length) {
        return currentRange;
      }

      return models.length;
    });
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '446px',
        boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)',
        borderRadius: '10px',
        marginBottom: '40px',
        borderLeft: '8px solid rgba(239, 76, 54, 0.5)',
        height: '100%'
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
        <SearchField size="small" fullWidth />
      </Box>
      <List>
        {models.slice(0, range).map((model, index) => (
          <ModelItem key={index} border={index === 1} model={model} />
        ))}
        {range < models.length && (
          <Button
            sx={{
              padding: '8px',
              marginLeft: '30px'
            }}
            variant="text"
            onClick={handleRange}
          >
            See all (+{models.length - range})
          </Button>
        )}
      </List>
    </Box>
  );
}
