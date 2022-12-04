import React, { memo, Dispatch, SetStateAction } from 'react';

import { SelectChangeEvent, MenuItem, styled } from '@mui/material';

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
      <StyledMarkedSelect
        label="Select feature"
        size="small"
        value={feature}
        onChange={handleFeatureChange}
        disabled={disabled}
      >
        {features.map((value, index) => (
          <MenuItem key={`${value}${index}`} value={value}>
            {value}
          </MenuItem>
        ))}
      </StyledMarkedSelect>
    )
  );
};

const StyledMarkedSelect = styled(MarkedSelect)({
  width: '276px',
  marginBottom: '14px'
});

export const AnalysisGroupByFeaturesSelect = memo(AnalysisGroupByFeaturesSelectComponent);
