import React from 'react';

import { Stack, Checkbox, alpha, styled, StackProps } from '@mui/material';
import { NotificationsActiveRounded, NotificationsOffRounded } from '@mui/icons-material';

import { StyledText } from 'components/lib';

import { DeepchecksMonitoringEeApiV1MembersIdNotifySchema } from 'api/generated';

interface DialogListItemProps extends StackProps {
  title: string;
  subtitle: string;
  selected: boolean;
  setModelsAndNotifications?: React.Dispatch<React.SetStateAction<DeepchecksMonitoringEeApiV1MembersIdNotifySchema[]>>;
}

export const StyledContainer = styled(Stack)(({ theme }) => ({
  padding: '12px 0',
  borderRadius: '5px',
  flexDirection: 'row',

  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1)
  }
}));

export const DialogListItem = (props: DialogListItemProps) => {
  const { title, subtitle, selected, setModelsAndNotifications, ...otherProps } = props;
  return (
    <StyledContainer>
      <Stack {...otherProps}>
        <Checkbox checked={selected} sx={{ marginRight: '15px' }} />
      </Stack>
      <Stack>
        <StyledText type="h3" text={title} sx={{ fontWeight: 700, marginBottom: '3px' }} />
        <StyledText type="small" text={subtitle} />
      </Stack>
      <StyledContainer marginLeft="auto">
        {setModelsAndNotifications && (
          <>{selected ? <NotificationsActiveRounded color="primary" /> : <NotificationsOffRounded color="primary" />}</>
        )}
      </StyledContainer>
    </StyledContainer>
  );
};
