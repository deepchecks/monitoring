import React from 'react';
import { StyledModal, StyledModalCloseButton, StyledModalContent } from './ModalItemViewDetails.style';
import { CloseIcon } from 'assets/icon/icon';
import { ConnectedModelSchema } from 'api/generated';
import { ModelDetails } from './ModelDetails';

interface ModalItemDetailsProps {
  open: boolean;
  onClose: () => void;
  model: ConnectedModelSchema;
}

export const ModalItemViewDetails = ({ open, onClose, model }: ModalItemDetailsProps) => (
  <StyledModal open={open} onClose={onClose} aria-labelledby="model-versions" aria-describedby="model-all-versions">
    <StyledModalContent>
      <StyledModalCloseButton onClick={onClose}>
        <CloseIcon />
      </StyledModalCloseButton>
      <ModelDetails model={model} />
    </StyledModalContent>
  </StyledModal>
);
