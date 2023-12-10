import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';

import { Button, Stack } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FileUploadIcon from '@mui/icons-material/FileUpload';

import { StyledDialog } from 'components/lib';

import {
  StyledDescription,
  StyledTextField,
  StyledUploadArea,
  StyledIconButton,
  StyledPreviewContainer
} from './ReportModal.style';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
}

export const ReportModal = ({ open, onClose }: ReportModalProps) => {
  const [inputDescription, setInputDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInputDescription(e.target.value);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSelectedFile(e.target.files[0]);
  };

  useEffect(() => {
    if (!selectedFile) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleFormSubmit = () => {
    if (inputDescription && selectedFile) {
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

  const handleCloseDialog = () => {
    onClose();
    setTimeout(() => {
      setInputDescription('');
      setSelectedFile(null);
      setPreview(null);
    }, 150);
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleCloseDialog}
      closeDialog={handleCloseDialog}
      title="Report a bug"
      submitButtonLabel="Sent Report"
      submitButtonAction={handleFormSubmit}
      submitButtonDisabled={!inputDescription}
    >
      <StyledDescription paragraph>Please tell us what went wrong with the product</StyledDescription>
      <Stack>
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
        {selectedFile && preview && (
          <StyledPreviewContainer>
            <img src={preview} width="20%" />
            <StyledIconButton onClick={() => setSelectedFile(null)}>
              <ClearIcon />
            </StyledIconButton>
          </StyledPreviewContainer>
        )}
      </Stack>
    </StyledDialog>
  );
};
