import React, { FC } from 'react';
import {
  StyledModal,
  StyledModalCloseButton,
  StyledModalContent,
  StyledModalList,
  StyledModalTitle,
  StyledModalTitleText
} from './ModalItemViewDetails.style';
import { CloseIcon } from 'assets/icon/icon';
import ModelDetailsList from './ModelDetails/ModelDetailsList';
import { ConnectedModelSchema } from 'api/generated';
import { ModelDetails } from './ModelDetails';

interface ModalItemDetailsProps {
  open: boolean;
  onClose: () => void;
  model: ConnectedModelSchema;
}

export const ModalItemViewDetails: FC<ModalItemDetailsProps> = ({ open, onClose, model }) => {
  return (
    <StyledModal open={open} onClose={onClose} aria-labelledby="model-versions" aria-describedby="model-all-versions">
      <StyledModalContent>
        <StyledModalCloseButton onClick={onClose}>
          <CloseIcon />
        </StyledModalCloseButton>
        <ModelDetails model={model} />
      </StyledModalContent>
    </StyledModal>
  );
};
