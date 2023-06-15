import React, { useState } from 'react';

import { Box, Tab } from '@mui/material';
import { TabContext } from '@mui/lab';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';

import {
  ConnectedModelSchema,
  useRetriveConnectedModelVersionsApiV1ConnectedModelsModelIdVersionsGet
} from 'api/generated';

import { ModelLogs } from './components/ModelLogs/ModelLogs';
import { Loader } from 'components/base/Loader/Loader';
import { ModelNotes } from './components/ModelNotes';
import { StyledModalTitle, StyledModalTitleText } from '../../ModalItemViewDetails.style';
import { theme } from 'components/lib/theme';

interface ModelDetailsProps {
  model: ConnectedModelSchema;
}

export const ModelDetails = ({ model }: ModelDetailsProps) => {
  const [value, setValue] = useState('1');
  const { data, isLoading } = useRetriveConnectedModelVersionsApiV1ConnectedModelsModelIdVersionsGet(model.id);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => setValue(newValue);

  return (
    <>
      <StyledModalTitle>
        <StyledModalTitleText>{model.name} Details</StyledModalTitleText>
      </StyledModalTitle>
      <Box width="100%">
        {isLoading ? (
          <Loader />
        ) : (
          <TabContext value={value}>
            <TabList
              value={value}
              onChange={handleTabChange}
              sx={{ borderBottom: `solid 1px ${theme.palette.grey.light}` }}
            >
              <Tab label={`All Versions Logs (${data?.length})`} value="1" color={theme.palette.text.disabled} />
              <Tab label="My notes" value="2" color={theme.palette.text.disabled} />
            </TabList>
            <TabPanel value="1" sx={{ padding: '0', height: '585px' }}>
              <ModelLogs logs={logs as any} />
            </TabPanel>
            <TabPanel value="2" sx={{ padding: '0', height: '585px' }}>
              <ModelNotes model={model} />
            </TabPanel>
          </TabContext>
        )}
      </Box>
    </>
  );
};

export const logs = [
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  },
  {
    id: 19996,
    sample_id: '417428',
    error: 'Duplicate index on log',
    sample:
      "{'_dc_sample_id': '417428', 'neighbourhood_group': 'Manhattan', 'neighbourhood': 'Upper East Side', 'room_type': 'Entire home/apt', 'minimum_nights': 30, 'number_of_reviews': 5, 'reviews_per_month': 0.34, 'calculated_host_listings_count': 3, 'availability_365': 283, 'has_availability': 'yes', '_dc_time': DateTime(2023, 5, 29, 12, 53, 5, tzinfo=Timezone('UTC')), '_dc_prediction': 114.0, '_dc_logged_time': DateTime(2023, 6, 8, 16, 38, 56, 179037, tzinfo=Timezone('+03:00'))}",
    created_at: '2023-06-08T13:39:03.068176+00:00',
    model_version_id: 1
  }
];
