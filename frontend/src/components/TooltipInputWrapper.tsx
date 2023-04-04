import { Box, ClickAwayListener, Tooltip, useTheme } from '@mui/material';
import { InfoIcon } from 'assets/icon/icon';
import React, { ReactNode, useRef, useState } from 'react';

interface TooltipInputWrapperProps {
  children: ReactNode;
  title: string;
}

export function TooltipInputWrapper({ children, title }: TooltipInputWrapperProps) {
  const [openTooltip, setOpenTooltip] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();

  const handleTooltipClose = () => {
    setOpenTooltip(false);
  };

  const handleTooltipOpen = () => {
    setOpenTooltip(true);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        '& .MuiOutlinedInput-notchedOutline': {
          zIndex: 4
        },
        '& .MuiInputBase-input': {
          paddingRight: '35px'
        }
      }}
      ref={wrapperRef}
    >
      <ClickAwayListener onClickAway={handleTooltipClose}>
        <Tooltip
          PopperProps={{
            disablePortal: true
          }}
          onClose={handleTooltipClose}
          open={openTooltip}
          disableFocusListener
          disableHoverListener
          disableTouchListener
          title={title}
          placement="top"
        >
          <Box
            sx={theme => ({
              position: 'absolute',
              width: '24px',
              zIndex: 2,
              top: 0,
              right: 0,
              height: 1,
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.palette.grey[100]
            })}
            onClick={handleTooltipOpen}
          >
            <InfoIcon fill={openTooltip ? theme.palette.text.primary : theme.palette.text.disabled} />
          </Box>
        </Tooltip>
      </ClickAwayListener>
      {children}
    </Box>
  );
}
