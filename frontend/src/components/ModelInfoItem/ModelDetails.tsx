import React from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import {
  ConnectedModelSchema,
  useRetriveConnectedModelVersionsApiV1ConnectedModelsModelIdVersionsGet
} from 'api/generated';

import { Box, Button, Grid, Tab, Typography } from '@mui/material';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';

import { Loader } from 'components/Loader';

import { HighPriority, ViewDetails } from 'assets/icon/icon';

dayjs.extend(localizedFormat);

interface ModelDetailsProps {
  model: ConnectedModelSchema;
}

const ModelDetails = ({ model }: ModelDetailsProps) => {
  const [value, setValue] = React.useState('1');

  const { data: versions, isLoading } = useRetriveConnectedModelVersionsApiV1ConnectedModelsModelIdVersionsGet(
    model.id
  );
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {isLoading ? (
        <Loader />
      ) : (
        <TabContext value={value}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList value={value} onChange={handleChange} aria-label="basic tabs example">
              <Tab label={`All Versions (${versions?.length})`} value="1" />
              <Tab label="Top Secret" value="2" />
            </TabList>
          </Box>
          <TabPanel value="1">
            <Grid container spacing={0.5} columns={4}>
              {versions?.map(version => (
                <>
                  <Grid item xs={1}>
                    {version.n_of_alerts > 0 ? (
                      <Typography sx={{ color: '#EF4C36' }}>
                        <div
                          style={{
                            background: '#EF4C36',
                            borderRadius: '10px',
                            height: '24px',
                            color: 'white',
                            textAlign: 'center',
                            width: 'fit-content',
                            minWidth: '50px',
                            display: 'inline-block',
                            marginRight: '5px',
                            padding: '2px'
                          }}
                        >
                          <HighPriority style={{ width: '14px', height: '14px' }}></HighPriority>
                          <span style={{ marginBottom: '1px' }}>{version.n_of_alerts}</span>
                        </div>
                        {version.name}
                      </Typography>
                    ) : (
                      <Typography>{version.name}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={1}>
                    <Typography sx={{ color: '#94A4AD' }}>
                      Last update:{' '}
                      {version.last_update_time ? `(${dayjs(version.last_update_time).format('L')})` : '- '}
                    </Typography>
                  </Grid>
                  <Grid item xs={1}>
                    <Typography sx={{ color: '#94A4AD' }}>Pending rows: {version.n_of_pending_rows}</Typography>
                  </Grid>
                  <Grid item xs={1}>
                    <Box sx={{ justifyContent: 'end', display: 'flex' }}>
                      <Button variant="outlined" sx={{ borderRadius: '5px', width: 'fit-content' }}>
                        <ViewDetails />
                      </Button>
                    </Box>
                  </Grid>
                </>
              ))}
            </Grid>
          </TabPanel>
          <TabPanel value="2">Congrats! You have found the first easter egg on Deepchecks. Keep looking :)</TabPanel>
        </TabContext>
      )}
    </Box>
  );
};

export default ModelDetails;
