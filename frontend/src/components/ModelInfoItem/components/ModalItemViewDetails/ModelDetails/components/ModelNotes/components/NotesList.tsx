import React from 'react';
import { Box, styled } from '@mui/material';
import { ModelNoteSchema } from 'api/generated';
import { SingleNote } from './SingleNote';

interface NotesListProps {
  notes: ModelNoteSchema[];
  onDeleteNote: (noteId: string) => void;
}

export const NotesList = ({ notes, onDeleteNote }: NotesListProps) => (
  <StyledList component="ul">
    {notes.map(note => (
      <SingleNote key={`${note.model_id}-${note.id}-${note.title}`} onDeleteNote={onDeleteNote} note={note} />
    ))}
  </StyledList>
);

const StyledList = styled(Box)({
  height: '100%',
  width: '65%',
  padding: '12px 32px 0 0',
  overflowY: 'auto',
  margin: 0
});
