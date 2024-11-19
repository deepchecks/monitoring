import React, { useState } from 'react';

import { Box, Divider, IconButton, styled, Tooltip, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';

import dayjs from 'dayjs';

import { ModelNoteSchema } from 'api/generated';

import { theme } from 'components/lib/theme';

interface SingleNoteProps {
  note: ModelNoteSchema;
  onDeleteNote: (noteId: string) => void;
}

export const SingleNote = ({ note, onDeleteNote }: SingleNoteProps) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <StyledItem onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} component="li">
      <StyledNoteTitle variant="h3">{note.title}</StyledNoteTitle>
      {`${note.text}`.length > 180 ? (
        <Tooltip title={`${note.text}`}>
          <StyledNoteText paragraph>{note.text}</StyledNoteText>
        </Tooltip>
      ) : (
        <StyledNoteText paragraph>{note.text}</StyledNoteText>
      )}
      <StyledNoteDate>{`${dayjs(note.created_at).format('lll')}`}</StyledNoteDate>
      <Divider light />
      {isHovered && (
        <StyledIconButton onClick={() => onDeleteNote(note.id)}>
          <Delete color="primary" />
        </StyledIconButton>
      )}
    </StyledItem>
  );
};

const StyledItem = styled(Box)({
  display: 'flex',
  position: 'relative',
  flexDirection: 'column',
  gap: '8px',
  color: theme.palette.text.primary,
  paddingTop: '20px'
});

const StyledNoteTitle = styled(Typography)({
  color: 'inherit',
  fontSize: '18px',
  fontWeight: 600
});

const StyledNoteText = styled(Typography)({
  color: 'inherit',
  fontSize: '16px',
  fontWeight: 400,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  margin: 0,
  '@supports (-webkit-line-clamp: 2)': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'initial',
    wordBreak: 'break-all',
    display: '-webkit-box',
    '-webkit-line-clamp': '2',
    '-webkit-box-orient': 'vertical'
  }
});

const StyledNoteDate = styled(Typography)({
  fontSize: '12px',
  fontWeight: 600,
  color: theme.palette.text.disabled,
  padding: '8px 0 12px'
});

const StyledIconButton = styled(IconButton)({
  position: 'absolute',
  right: 0,
  top: '50%',
  transform: 'translateY(-50%)'
});
