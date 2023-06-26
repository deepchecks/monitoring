import React from 'react';

import { Divider, Stack } from '@mui/material';

import {
  ConnectedModelSchema,
  ModelNoteCreationSchema,
  useCreateModelNotesApiV1ModelsModelIdNotesPost,
  useDeleteModelNoteApiV1ModelsNotesModelNoteIdDelete,
  useRetrieveModelNotesApiV1ModelsModelIdNotesGet
} from 'api/generated';

import { Loader } from 'components/base/Loader/Loader';
import { CreateNote } from './components/CreateNote';
import { NotesList } from './components/NotesList';

interface ModelNotesProps {
  model: ConnectedModelSchema;
}

export const ModelNotes = ({ model }: ModelNotesProps) => {
  const { data: notes, isLoading, refetch } = useRetrieveModelNotesApiV1ModelsModelIdNotesGet(model.id);
  const { mutateAsync: createNote } = useCreateModelNotesApiV1ModelsModelIdNotesPost();
  const { mutateAsync: deleteNote } = useDeleteModelNoteApiV1ModelsNotesModelNoteIdDelete();

  const handleCreateNote = async (note: ModelNoteCreationSchema) => {
    await createNote({ modelId: model.id, data: [note] });
    await refetch();
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote({ modelNoteId: +noteId });
    await refetch();
  };

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        notes && (
          <Stack direction="row" sx={{ height: '100%' }}>
            <NotesList onDeleteNote={handleDeleteNote} notes={notes} />
            <Divider light orientation="vertical" flexItem />
            <CreateNote onCreate={handleCreateNote} />
          </Stack>
        )
      )}
    </>
  );
};
