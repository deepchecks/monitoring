import React, { useState } from 'react';
import { Table, TableBody, TableContainer, TableHead, TableRow, TextField } from '@mui/material';

import { StyledDivider, StyledLogsFiltersContainer, StyledTableHeadCell } from '../../ModelDetails.style';
import { SingleLog } from './components/SingleLog';
import { StyledInput } from 'components/lib';
import { DatePicker } from 'components/base/DatePicker/DatePicker';
import { SelectPrimary, SelectPrimaryItem } from 'components/Select/SelectPrimary';

const tableHeaders = ['Version', 'Date', 'Reason', 'Sample ID', 'Sample'];

export const ModelLogs = () => {
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState<Date | null>();
  const [endDate, setEndDate] = useState<Date | null>();
  const [version, setVersion] = useState('');

  const handleStartDateChange = (currentStartDate: Date | null) => {
    if (currentStartDate && endDate && currentStartDate < endDate) {
      setStartDate(currentStartDate);
    }
  };

  const handleEndDateChange = (currentEndDate: Date | null) => {
    if (currentEndDate && startDate && currentEndDate > startDate) {
      setEndDate(currentEndDate);
    }
  };

  return (
    <div>
      {logs && (
        <TableContainer sx={{ maxHeight: '540px' }}>
          <StyledLogsFiltersContainer>
            <SelectPrimary
              label="Version"
              onChange={e => setVersion(e.target.value as string)}
              value={version}
              size="small"
            >
              {['version1', 'version2'].map(value => (
                <SelectPrimaryItem value={value} key={value}>
                  {value}
                </SelectPrimaryItem>
              ))}
            </SelectPrimary>
            <StyledDivider />
            <DatePicker
              inputFormat="L"
              onChange={handleStartDateChange}
              value={startDate}
              label="Start Date"
              disableMaskedInput
              renderInput={(alertFilters: any) => <TextField {...alertFilters} size="small" />}
            />
            -
            <DatePicker
              inputFormat="L"
              onChange={handleEndDateChange}
              value={endDate}
              label="End Date"
              disableMaskedInput
              renderInput={(alertFilters: any) => <TextField {...alertFilters} size="small" />}
            />
            <StyledDivider />
            <StyledInput
              value={reason}
              onChange={e => setReason(e.target.value)}
              onCloseIconClick={() => setReason('')}
              sx={{ width: '500px', height: '36px' }}
              placeholder="Search reason..."
            />
          </StyledLogsFiltersContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {tableHeaders.map((header: string) => (
                  <StyledTableHeadCell key={header} width="20%">
                    {header}
                  </StyledTableHeadCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <SingleLog key={`${log.id}-${log.sample_id}`} log={log} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
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
