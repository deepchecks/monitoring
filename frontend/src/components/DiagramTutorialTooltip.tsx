import React, { useState, useEffect, ReactElement } from 'react';

import { styled, Tooltip, TooltipProps, tooltipClasses, Typography, Fade } from '@mui/material';

import { getStorageItem, setStorageItem } from 'helpers/utils/localStorage';

interface DiagramTutorialTooltipProps {
  children: ReactElement<any, any>;
}

type WindowTimeout = ReturnType<typeof setTimeout>;

const TOOLTIP_COUNT = 'TOOLTIP_COUNT';

let tooltipCount: number;

const DiagramTutorialTooltip = ({ children }: DiagramTutorialTooltipProps) => {
  const [open, setOpen] = useState(false);
  const [closeTimeout, setCloseTimeout] = useState<WindowTimeout>();

  useEffect(() => {
    tooltipCount = getStorageItem(TOOLTIP_COUNT) || 0;
  });

  const handleClose = () => {
    clearTimeout(closeTimeout);
    setOpen(false);
  };

  const handleOpen = () => {
    if (tooltipCount < 3) {
      setOpen(true);
      setStorageItem<number>(TOOLTIP_COUNT, tooltipCount + 1);

      const closeDelay = setTimeout(() => setOpen(false), 5000);
      setCloseTimeout(closeDelay);
    }
  };

  return (
    <StyledTooltip
      title={
        <>
          <Typography>Drag with mouse to view more the X axis.</Typography>
          <Typography>Zoom in/zoom out with mouse scroll.</Typography>
        </>
      }
      enterDelay={2600}
      enterNextDelay={2600}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 600 }}
      followCursor
      placement="top"
      open={open}
      onOpen={handleOpen}
      onClose={handleClose}
    >
      {children}
    </StyledTooltip>
  );
};

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 'none'
  }
});

export default DiagramTutorialTooltip;
