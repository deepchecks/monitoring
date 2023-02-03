import React, { FC, useState } from 'react';
import { ConnectedModelSchema, ConnectedModelVersionSchema } from 'api/generated';
import { StyledModalList, StyledModalTitle, StyledModalTitleText } from '../ModalItemViewDetails.style';
import ModelDetailsList from './ModelDetailsList';
import { VersionDetails } from './VersionDetails';

interface ModelDetailsProps {
  model: ConnectedModelSchema;
}

export const ModelDetails: FC<ModelDetailsProps> = ({ model }) => {
  const [version, setVersion] = useState<ConnectedModelVersionSchema | null>(null);

  const handleVersionDetailsOpen = (version: ConnectedModelVersionSchema) => setVersion(version);
  const handleVersionDetailsClose = () => setVersion(null);

  return (
    <>
      {!version ? (
        <>
          <StyledModalTitle>
            <StyledModalTitleText>{model.name} Details</StyledModalTitleText>
          </StyledModalTitle>
          <StyledModalList>
            <ModelDetailsList onVersionDetailsOpen={handleVersionDetailsOpen} model={model} />
          </StyledModalList>
        </>
      ) : (
        <VersionDetails onClose={handleVersionDetailsClose} modelId={model.id} version={version} />
      )}
    </>
  );
};
