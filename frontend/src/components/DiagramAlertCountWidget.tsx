import React, { useEffect } from 'react';

import { AlertSchema } from 'api/generated';

import { Button, Stack, styled, Typography, StackProps } from '@mui/material';

import { events, reportEvent } from 'helpers/services/mixPanel';

import { FastForward as Next, Rewind as Prev } from 'assets/icon/icon';
import { colors } from 'theme/colors';

function setAlertCountWidgetButtonOpacity(isDisabled: boolean) {
  return isDisabled ? 0.3 : 1;
}

const PRIMARY_VIOLET = colors.primary.violet[400];
const NEUTRAL_GREY = colors.neutral.grey[200];

interface DiagramAlertCountWidgetProps extends StackProps {
  alerts: AlertSchema[];
  alertIndex: number;
  changeAlertIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const DiagramAlertCountWidget = ({
  alerts,
  alertIndex,
  changeAlertIndex,
  ...props
}: DiagramAlertCountWidgetProps) => {
  useEffect(() => {
    reportEvent(events.alertsPage.navigationBetweenAlerts);
  }, [alertIndex]);

  const isPrevDisabled = !alertIndex;
  const isNextDisabled = alertIndex + 1 === alerts.length;

  return (
    <StyledContainer {...props}>
      <StyledPrevAlertButton
        variant="text"
        disabled={isPrevDisabled}
        onClick={() => changeAlertIndex(prevIndex => prevIndex - 1)}
        sx={{ opacity: setAlertCountWidgetButtonOpacity(isPrevDisabled) }}
      >
        <Prev fill={PRIMARY_VIOLET} />
      </StyledPrevAlertButton>
      <StyledContentContainer>
        <StyledContent>{`Alert ${alertIndex + 1}/${alerts.length}`}</StyledContent>
      </StyledContentContainer>
      <StyledNextAlertButton
        variant="text"
        disabled={isNextDisabled}
        onClick={() => changeAlertIndex(prevIndex => prevIndex + 1)}
        sx={{ opacity: setAlertCountWidgetButtonOpacity(isNextDisabled) }}
      >
        <Next fill={PRIMARY_VIOLET} />
      </StyledNextAlertButton>
    </StyledContainer>
  );
};

const StyledContainer = styled(Stack)({
  flexDirection: 'row',
  width: '173px',
  height: '36px'
});

const StyledContentContainer = styled(Stack)({
  alignItems: 'center',
  justifyContent: 'center',
  width: '97px',
  margin: 0,
  borderTop: `1px solid ${NEUTRAL_GREY}`,
  borderBottom: `1px solid ${NEUTRAL_GREY}`
});

const StyledContent = styled(Typography)({
  fontSize: '12px',
  letterSpacing: '0.1px'
});

const StyledButton = styled(Button)({
  minWidth: '39px',
  minHeight: '36px',
  padding: '0px 9px 0px 6px',
  boxShadow: 'none',
  border: `3px solid ${PRIMARY_VIOLET}`
});

const StyledPrevAlertButton = styled(StyledButton)({
  borderRadius: '4px 0 0 4px'
});

const StyledNextAlertButton = styled(StyledButton)({
  borderRadius: '0 4px 4px 0'
});
