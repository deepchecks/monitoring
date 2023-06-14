import React from 'react';

import { Box, styled, Tab } from '@mui/material';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { TabContext } from '@mui/lab';

import {
  ConnectedModelSchema,
  useRetriveConnectedModelVersionsApiV1ConnectedModelsModelIdVersionsGet
} from 'api/generated';

import { ErrorsTable } from './components/ErrorsTable/ErrorsTable';
import { Loader } from 'components/base/Loader/Loader';
import { ModelNotes } from './components/ModelNotes';
import { theme } from 'components/lib/theme';

import { StyledModalTitle, StyledModalTitleText } from '../../ModalItemViewDetails.style';

interface ModelDetailsProps {
  model: ConnectedModelSchema;
}

export const ModelDetails = ({ model }: ModelDetailsProps) => {
  const [value, setValue] = React.useState('1');
  const { data: versions, isLoading } = useRetriveConnectedModelVersionsApiV1ConnectedModelsModelIdVersionsGet(
    model.id
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => setValue(newValue);

  return (
    <>
      <>
        <StyledModalTitle>
          <StyledModalTitleText>{model.name} Details</StyledModalTitleText>
        </StyledModalTitle>
        <StyledTabSection>
          {isLoading ? (
            <Loader />
          ) : (
            <TabContext value={value}>
              <StyledTabList value={value} onChange={handleTabChange}>
                <StyledTab label={`All Versions Logs (${versions?.length})`} value="1" />
                <StyledTab label="My notes" value="2" />
              </StyledTabList>
              <StyledTabPanel value="1">
                <ErrorsTable errors={[] as any} />
              </StyledTabPanel>
              <StyledTabPanel value="2">
                <ModelNotes model={model} />
              </StyledTabPanel>
            </TabContext>
          )}
        </StyledTabSection>
      </>
    </>
  );
};

const StyledTabSection = styled(Box)({
  width: '100%'
});

const StyledTabPanel = styled(TabPanel)({
  padding: '0',
  height: '585px'
});

const StyledTab = styled(Tab)({
  color: theme.palette.text.disabled
});

const StyledTabList = styled(TabList)({
  borderBottom: `solid 1px ${theme.palette.grey.light}`
});
