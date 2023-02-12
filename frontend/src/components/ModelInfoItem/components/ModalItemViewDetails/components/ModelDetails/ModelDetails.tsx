import React, { useState } from 'react';
import {
  ConnectedModelSchema,
  ConnectedModelVersionSchema,
  useRetriveConnectedModelVersionsApiV1ConnectedModelsModelIdVersionsGet
} from 'api/generated';
import { StyledModalTitle, StyledModalTitleText } from '../../ModalItemViewDetails.style';
import { VersionDetails } from './components/VersionDetails';
import { VersionsTable } from './components/VersionsTable';
import { Box, styled, Tab } from '@mui/material';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { TabContext } from '@mui/lab';
import { Loader } from 'components/Loader';
import { ModelNotes } from './components/ModelNotes';
import { colors } from 'theme/colors';

interface ModelDetailsProps {
  model: ConnectedModelSchema;
}

export const ModelDetails = ({ model }: ModelDetailsProps) => {
  const [value, setValue] = React.useState('1');
  const [selectedVersionForDetails, setSelectedVersionForDetails] = useState<ConnectedModelVersionSchema | null>(null);
  const { data: versions, isLoading } = useRetriveConnectedModelVersionsApiV1ConnectedModelsModelIdVersionsGet(
    model.id
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => setValue(newValue);
  const handleVersionDetailsOpen = (version: ConnectedModelVersionSchema) => setSelectedVersionForDetails(version);
  const handleVersionDetailsClose = () => setSelectedVersionForDetails(null);

  return (
    <>
      {!selectedVersionForDetails ? (
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
                  <StyledTab label={`All Versions (${versions?.length})`} value="1" />
                  <StyledTab label="My notes" value="2" />
                </StyledTabList>
                <StyledTabPanel value="1">
                  <VersionsTable onVersionDetailsOpen={handleVersionDetailsOpen} versions={versions} />
                </StyledTabPanel>
                <StyledTabPanel value="2">
                  <ModelNotes model={model} />
                </StyledTabPanel>
              </TabContext>
            )}
          </StyledTabSection>
        </>
      ) : (
        <VersionDetails onClose={handleVersionDetailsClose} modelId={model.id} version={selectedVersionForDetails} />
      )}
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
  color: colors.neutral.lightText
});

const StyledTabList = styled(TabList)({
  borderBottom: `solid 1px ${colors.neutral.grey.light}`
});
