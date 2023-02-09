import React, { FC } from 'react';
import { IngestionErrorSchema } from 'api/generated';
import { Divider, Stack, styled, Tooltip, Typography } from '@mui/material';

interface VersionErrorsSingleItemProps {
  isHeader: boolean;
  error: IngestionErrorSchema;
}

const VersionErrorsSingleItem: FC<VersionErrorsSingleItemProps> = ({ error, isHeader }) => {
  const date = new Date(error.created_at).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <StyledSingleItem alignItems="center" direction="row" spacing="45px" isHeader={isHeader}>
      <StyledTypography sx={{ width: '80px', color: isHeader ? 'inherit' : '#EF4C36' }}>
        {error.sample_id}
      </StyledTypography>
      <Tooltip title={error.sample || ''}>
        <StyledTypography noWrap={true} sx={{ width: '270px' }}>
          {error.sample}
        </StyledTypography>
      </Tooltip>
      <Tooltip title={`${error.error}`}>
        <StyledTypography noWrap={true} sx={{ width: '205px', padding: '21px' }}>
          {error.error}
        </StyledTypography>
      </Tooltip>
      <StyledTypography noWrap={true} sx={{ width: '145px' }}>
        {isHeader ? error.created_at : date}
      </StyledTypography>
      {!isHeader && <Divider />}
    </StyledSingleItem>
  );
};

export default VersionErrorsSingleItem;

const StyledTypography = styled(Typography)({
  fontSize: 'inherit'
});

interface StyledSingleItemProps {
  isHeader: boolean;
}

const StyledSingleItem = styled(Stack)<StyledSingleItemProps>(({ isHeader }) => ({
  backgroundColor: isHeader ? '#78858C' : '#fff',
  color: isHeader ? '#fff' : '#3A474E',
  fontSize: '14px',
  height: '56px',
  padding: '8px'
}));
