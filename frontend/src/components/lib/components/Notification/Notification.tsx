import React from 'react';

import { CancelRounded, InfoRounded } from '@mui/icons-material';

import { paletteOptions } from '../../theme/palette';

import { Text } from '../Text/Text';
import { Container } from '../Container/Container';

export interface NotificationProps {
  title: string;
  content?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  onNotificationClick?: () => void;
  onDelete?: () => void;
}

export const Notification = (props: NotificationProps) => {
  const { severity, title, content, onDelete, onNotificationClick = () => '' } = props;

  const bgColor = () => {
    switch (severity) {
      case 'low':
        return (paletteOptions.secondary as any).main;
      case 'medium':
        return paletteOptions.severity?.medium;
      case 'high':
        return paletteOptions.severity?.high;
      case 'critical':
        return paletteOptions.severity?.critical;
      default:
        return (paletteOptions.primary as any).main;
    }
  };

  const containerMaxWidth = onDelete ? '390px' : '300px';

  return (
    <Container
      background={bgColor()}
      maxWidth={containerMaxWidth}
      height="80px"
      width="100%"
      flexDirection="row"
      borderRadius="12px"
      alignItems="center"
      justifyContent="space-between"
      padding="24px"
    >
      <InfoRounded
        sx={{ color: paletteOptions.common?.white, cursor: 'pointer' }}
        onClick={() => onNotificationClick()}
      />
      <Container marginRight="auto" padding="2px 2px 0" gap="2px">
        <Text text={title} color={paletteOptions.common?.white} whiteSpace="nowrap" type="h3" width="200px" />
        {content && <Text text={content} color={paletteOptions.common?.white} whiteSpace="nowrap" width="200px" />}
      </Container>
      {onDelete && (
        <Container flexDirection="row" width="120px" padding="0">
          <Text text="Delete" color={paletteOptions.common?.white} type="h3" padding="2px 0 0" />
          <CancelRounded sx={{ color: paletteOptions.common?.white, cursor: 'pointer' }} onClick={() => onDelete()} />
        </Container>
      )}
    </Container>
  );
};
