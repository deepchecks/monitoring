import React, { FC, useState } from 'react';
import { Button } from '@mui/material';
import * as Sentry from '@sentry/react';

import { StyledDescription, StyledForm, StyledTextField, StyledUploadArea } from './ReportModal.style';

import { StyledDialog } from 'components/lib';

import { FileUploadIcon } from '../../../../../../../assets/icon/icon';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
}

export const ReportModal: FC<ReportModalProps> = ({ open, onClose }) => {
  const [inputDescription, setInputDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(undefined);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInputDescription(e.target.value);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedFile(e.target?.files?.[0]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputDescription !== '' && selectedFile !== undefined) {
      const reader = new FileReader();

      reader.onloadend = function () {
        const result = reader.result as string;
        const [imageData, path] = result.split(';');
        const [type] = imageData.split(':');
        const [currentPath] = path.split(',');

        Sentry.configureScope(scope => {
          scope.addAttachment({ filename: 'screenshot', data: currentPath, contentType: type });
        });

        Sentry.configureScope(scope => {
          scope.clearAttachments();
        });

        setInputDescription('');
        onClose();
      };

      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      closeDialog={onClose}
      title="Report a bug"
      submitButtonLabel="Sent Report"
      submitButtonAction={handleFormSubmit as () => void}
    >
      <StyledDescription paragraph={true}>Please tell us what went wrong with the product</StyledDescription>
      <StyledForm onSubmit={handleFormSubmit} component="form">
        <StyledTextField
          value={inputDescription}
          onChange={handleInputChange}
          label="Describe the bug"
          required
          multiline
          rows={4}
        />
        <StyledUploadArea>
          <Button startIcon={<FileUploadIcon />} variant="text" component="label">
            Upload screenshot
            <input onChange={handleFileChange} type="file" hidden accept="image/*" />
          </Button>
        </StyledUploadArea>
      </StyledForm>
    </StyledDialog>
  );
};
