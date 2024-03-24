import React from 'react';

import { Stack, Checkbox, styled, StackProps } from '@mui/material';
import { NotificationsActiveRounded, NotificationsOffRounded } from '@mui/icons-material';

import { StyledText } from 'components/lib';

interface DialogListItemProps extends StackProps {
  title: string;
  subtitle: string;
  selected: boolean;
  isNotified?: boolean;
  handleChangeNotify?: () => void;
}

export const StyledContainer = styled(Stack)({
  padding: '12px 0',
  borderRadius: '5px',
  flexDirection: 'row'
});

export const DialogListItem = (props: DialogListItemProps) => {
  const { title, subtitle, selected, isNotified, handleChangeNotify, ...otherProps } = props;

  return (
    <StyledContainer>
      <Stack {...otherProps}>
        <Checkbox checked={selected} sx={{ marginRight: '15px' }} />
      </Stack>
      <Stack>
        <StyledText type="h3" text={title} sx={{ fontWeight: 700, marginBottom: '3px' }} />
        <StyledText type="small" text={subtitle} />
      </Stack>
      <StyledContainer sx={{ cursor: 'pointer', marginLeft: 'auto', ':hover': { opacity: 0.6 } }}>
        {handleChangeNotify && selected && (
          <Stack onClick={() => handleChangeNotify()}>
            {isNotified ? <NotificationsActiveRounded color="primary" /> : <NotificationsOffRounded color="info" />}
          </Stack>
        )}
      </StyledContainer>
    </StyledContainer>
  );
};
