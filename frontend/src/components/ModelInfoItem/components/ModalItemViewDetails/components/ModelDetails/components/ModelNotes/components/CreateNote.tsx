import React, { FormEvent, useState } from 'react';
import { Box, Button, Stack, styled, TextField, Typography } from '@mui/material';
import { ModelNoteCreationSchema } from 'api/generated';

import { theme } from 'components/lib/theme';

interface CreateNoteProps {
  onCreate: (note: ModelNoteCreationSchema) => void;
}

export const CreateNote = ({ onCreate }: CreateNoteProps) => {
  const [inputTitle, setInputTitle] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');

  const submitHandler: React.FormEventHandler<HTMLDivElement> = (e: FormEvent<HTMLDivElement>): void => {
    e.preventDefault();

    onCreate({ title: inputTitle, text: inputText });

    setInputTitle('');
    setInputText('');
  };

  return (
    <StyledContainer>
      <StyledHeader variant="h2">Leave a New Note</StyledHeader>
      <StyledForm onSubmit={submitHandler} component="form">
        <StyledTextField
          value={inputTitle}
          onChange={event => setInputTitle(event.target.value)}
          required
          id="model-note-title"
          label="Enter note title..."
        />
        <StyledTextField
          value={inputText}
          onChange={event => setInputText(event.target.value)}
          multiline
          rows={12}
          required
          id="model-note-text"
          label="Enter note text here..."
        />
        <Button type="submit" sx={{ marginTop: '15px' }} size="large">
          Leave a note
        </Button>
      </StyledForm>
    </StyledContainer>
  );
};

const StyledContainer = styled(Stack)({
  width: '35%',
  padding: '32px 0 0 32px',
  gap: '32px'
});

const StyledHeader = styled(Typography)({
  color: theme.palette.text.primary,
  fontWeight: 700,
  fontSize: '24px'
});

const StyledForm = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
});

const StyledTextField = styled(TextField)({
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: theme.palette.primary.main
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.disabled
  }
});
