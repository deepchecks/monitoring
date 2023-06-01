import React from 'react';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, IconButton, Typography, Stack, styled, alpha } from '@mui/material';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import { MonitorSchema } from 'api/generated';

import { MonitorInfoTooltipBody } from './MonitorInfoTooltipBody';
import { theme } from 'components/lib/theme';
import { StyledText } from 'components/lib';

import { InfoIcon } from 'assets/icon/icon';

import { constants } from 'components/Dashboard/dashboard.constants';

interface MonitorInfoWidgetProps {
  monitor: MonitorSchema;
  hover: boolean;
  openRootMenu: boolean;
  zoomEnabled: boolean;
  setZoomEnabled: (zoomEnabled: boolean) => void;
  handleOpenRootMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const MonitorInfoWidget = (props: MonitorInfoWidgetProps) => {
  const { monitor, hover, openRootMenu, handleOpenRootMenu, setZoomEnabled, zoomEnabled } = props;

  const handleEnableZoom = () => setZoomEnabled(!zoomEnabled);

  return (
    <StyledTitleContainer>
      <StyledTitle>{monitor.name}</StyledTitle>
      {(hover || openRootMenu) && (
        <StyledTooltipContainer>
          {zoomEnabled && (
            <StyledTooltip
              title={
                <StyledText
                  color={theme.palette.primary.light}
                  text={constants.monitorInfoWidget.zoomReset}
                  type="bodyBold"
                />
              }
              placement="top"
              arrow
            >
              <IconButton onClick={handleEnableZoom} size="small" sx={{ margin: '0 8px' }}>
                <UndoIcon width="20px" height="20px" style={{ color: theme.palette.primary.main }} />
              </IconButton>
            </StyledTooltip>
          )}
          <StyledTooltip
            title={
              <StyledText
                color={theme.palette.primary.light}
                text={constants.monitorInfoWidget.zoomToolTipText}
                type="bodyBold"
              />
            }
            placement="top"
            arrow
          >
            <IconButton
              onClick={handleEnableZoom}
              size="small"
              sx={{ margin: '0 8px', background: `${zoomEnabled && theme.palette.primary.main}` }}
            >
              <ZoomInIcon
                width="20px"
                height="20px"
                style={{ color: `${zoomEnabled ? theme.palette.common.white : theme.palette.primary.main}` }}
              />
            </IconButton>
          </StyledTooltip>
          <StyledTooltip
            title={<MonitorInfoTooltipBody monitor={monitor} />}
            placement="top"
            PopperProps={{
              disablePortal: true
            }}
            arrow
          >
            <IconButton size="small">
              <InfoIcon width="20px" height="20px" fill={theme.palette.primary.main} />
            </IconButton>
          </StyledTooltip>
          <IconButton onClick={handleOpenRootMenu} size="small" sx={{ marginLeft: '8px' }}>
            <MoreVertIcon color="primary" />
          </IconButton>
        </StyledTooltipContainer>
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
  color: theme.palette.text.primary,
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
    background: alpha(theme.palette.text.primary, 0.95),
    borderRadius: '5px'
  }
});
