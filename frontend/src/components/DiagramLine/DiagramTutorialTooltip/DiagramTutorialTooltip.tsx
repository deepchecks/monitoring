import React, { useState, useEffect, useRef, ReactElement } from 'react';

import { styled, Box, Tooltip, TooltipProps, tooltipClasses, Typography, Fade } from '@mui/material';

import { getStorageItem, setStorageItem } from 'helpers/utils/localStorage';

import { WindowTimeout } from 'helpers/types/index';

interface DiagramTutorialTooltipProps {
  children: ReactElement<any, any>;
}

const TOOLTIP_COUNT = 'TOOLTIP_COUNT';
const ENTER_DELAY = 2600;
const CLOSE_DELAY = 5000;
const TRANSITION_TIMEOUT = 600;

let tooltipCount: number;

const DiagramTutorialTooltip = ({ children }: DiagramTutorialTooltipProps) => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);

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

      const closeDelay = setTimeout(() => setOpen(false), CLOSE_DELAY);
      setCloseTimeout(closeDelay);
    }
  };

  return (
    <FullLengthTooltip
      title={
        <>
          <Typography>Drag with mouse to view more the X axis.</Typography>
          <Typography>Zoom in/zoom out with mouse scroll.</Typography>
        </>
      }
      enterDelay={ENTER_DELAY}
      enterNextDelay={ENTER_DELAY}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: TRANSITION_TIMEOUT }}
      followCursor
      placement="top"
      open={open}
      onOpen={handleOpen}
      onClose={handleClose}
    >
      <Box ref={tooltipRef}>{children}</Box>
    </FullLengthTooltip>
  );
};

export const FullLengthTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  [`& .${tooltipClasses.tooltip}`]: {
    maxWidth: 'none'
  }
});

export default DiagramTutorialTooltip;
