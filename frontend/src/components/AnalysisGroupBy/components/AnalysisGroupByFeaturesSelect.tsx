import React, { memo, Dispatch, SetStateAction } from 'react';

import { SelectChangeEvent, MenuItem } from '@mui/material';

import { MarkedSelect } from 'components/MarkedSelect';

interface AnalysisGroupByFeaturesSelectProps {
  features: string[];
  feature: string | undefined;
  setFeature: Dispatch<SetStateAction<string | undefined>>;
  disabled: boolean;
}

export const AnalysisGroupByFeaturesSelectComponent = ({
  features,
  feature,
  setFeature,
  disabled
}: AnalysisGroupByFeaturesSelectProps) => {
  const handleFeatureChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    setFeature(value);
  };

  return (
    features && (
      <MarkedSelect
        label="Select feature"
        size="small"
        value={feature}
        onChange={handleFeatureChange}
        sx={{ width: '276px', marginBottom: '39px' }}
        disabled={disabled}
      >
        {features.map((value, index) => (
          <MenuItem key={`${value}${index}`} value={value}>
            {value}
          </MenuItem>
        ))}
      </MarkedSelect>
    )
  );
};

export const AnalysisGroupByFeaturesSelect = memo(AnalysisGroupByFeaturesSelectComponent);
