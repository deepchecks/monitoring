import React, { FC } from 'react';
import { IngestionErrorSchema } from 'api/generated';
import VersionErrorsSingleItem from './VersionErrorsSingleItem';
import { Box } from '@mui/material';

interface VersionErrorsListProps {
  errors: IngestionErrorSchema[] | undefined;
}

const VersionErrorsList: FC<VersionErrorsListProps> = ({ errors }) => (
  <>
    {errors ? (
      <Box sx={{ height: '440px' }}>
        <VersionErrorsSingleItem
          isHeader={true}
          error={{
            id: 1,
            sample_id: 'Sample ID',
            sample: 'Sample',
            created_at: 'Timestamp',
            error: 'Reason of error'
          }}
        />
        <Box sx={{ overflowY: 'auto', height: 'calc(100% - 56px)' }}>
          {errors.map((error, i) => (
            <VersionErrorsSingleItem key={i} isHeader={false} error={error} />
          ))}
        </Box>
      </Box>
    ) : (
      <div></div>
    )}
  </>
);

export default VersionErrorsList;
