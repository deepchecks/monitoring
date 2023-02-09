import React, { useEffect, useState } from 'react';

import { MonitorSchema } from 'api/generated';

import { Box, IconButton, Typography, Stack, ClickAwayListener, styled, alpha } from '@mui/material';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';

import { MonitorInfoTooltipBody } from './MonitorInfoTooltipBody';

import { MenuVertical, InfoIcon } from 'assets/icon/icon';

import { colors } from 'theme/colors';

interface MonitorInfoWidgetProps {
  monitor: MonitorSchema;
  hover: boolean;
  openRootMenu: boolean;
  handleOpenRootMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const MonitorInfoWidget = ({ monitor, hover, openRootMenu, handleOpenRootMenu }: MonitorInfoWidgetProps) => {
  const [infoTooltipIsOpen, setInfoTooltipIsOpen] = useState(false);

  const handleTooltipClose = () => setInfoTooltipIsOpen(false);

  const handleTooltipOpen = () => setInfoTooltipIsOpen(true);

  useEffect(() => {
    if (!hover) setInfoTooltipIsOpen(false);
  }, [hover]);

  return (
    <StyledTitleContainer>
      <StyledTitle>{monitor.name}</StyledTitle>
      {(hover || openRootMenu) && (
        <ClickAwayListener onClickAway={handleTooltipClose}>
          <StyledTooltipContainer>
            <StyledTooltip
              title={<MonitorInfoTooltipBody monitor={monitor} />}
              placement="top"
              arrow
              PopperProps={{
                disablePortal: true
              }}
              onClose={handleTooltipClose}
              open={infoTooltipIsOpen}
              disableFocusListener
              disableHoverListener
              disableTouchListener
            >
              <IconButton onClick={handleTooltipOpen} size="small">
                <InfoIcon width="20px" height="20px" fill={colors.primary.violet[400]} />
              </IconButton>
            </StyledTooltip>
            <IconButton onClick={handleOpenRootMenu} size="small" sx={{ marginLeft: '8px' }}>
              <MenuVertical />
            </IconButton>
          </StyledTooltipContainer>
        </ClickAwayListener>
      )}
    </StyledTitleContainer>
  );
};

const StyledTitleContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '20px',
  height: '18px'
});

const StyledTitle = styled(Typography)({
  color: colors.neutral.darkText,
  fontWeight: 700,
  fontSize: '20px',
  lineHeight: '18px',
  textAlign: 'left'
});

const StyledTooltipContainer = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center'
});

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 'none',
    padding: '15px 20px 14px 16px',
    background: alpha(colors.neutral.darkText, 0.95),
    borderRadius: '5px'
  }
});
