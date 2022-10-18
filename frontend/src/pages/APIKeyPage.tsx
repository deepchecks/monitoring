import { Box, Stack } from '@mui/material';
import { APIKey } from 'components/APIKey';
import { PageHeader } from '../components/PageHeader';

export const APIKeyPage = function () {
  return (
    <Box>
      <Stack spacing="40px">
        <PageHeader text="API Key" />
        <APIKey></APIKey>
      </Stack>
    </Box>
  );
};
