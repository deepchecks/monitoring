import { Box, MenuItem, Popover, Stack, Typography } from '@mui/material';
import { CollapseArrowRight } from 'assets/icon/icon';
import React, { ReactNode, useEffect, useRef, useState } from 'react';

interface NestedMenuProps {
  children: ReactNode;
  label: string;
}

export function NestedMenu({ children, label }: NestedMenuProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  const [menuActive, setMenuActive] = useState<boolean>(false);

  const [anchorEl, setAnchorEl] = useState<HTMLLIElement | null>(null);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const onMouseOver = () => {
    setMenuActive(true);
  };

  const onMouseLeave = () => {
    setMenuActive(false);
  };

  useEffect(() => {
    if (itemRef.current) {
      setAnchorEl(itemRef.current);
    }
  }, [itemRef.current]);

  return (
    <>
      <MenuItem
        ref={itemRef}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        sx={theme => ({
          minWidth: 220,
          padding: '11.5px 12px',
          background: menuActive ? theme.palette.grey[100] : 'transparent',
          ':hover': {
            background: theme.palette.grey[100]
          }
        })}
      >
        <Stack sx={{ width: 1 }} direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">{label}</Typography>
          <Box sx={{ path: { fill: theme => theme.palette.text.disabled } }}>
            <CollapseArrowRight />
          </Box>
        </Stack>
      </MenuItem>
      <Popover
        anchorEl={anchorEl}
        open={menuActive}
        onClose={handleClose}
        sx={{
          pointerEvents: 'none',
          '& .MuiPopover-paper': {
            margin: `0 5px`
          }
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <Box
          onMouseOver={onMouseOver}
          onMouseLeave={onMouseLeave}
          sx={{
            pointerEvents: 'auto'
          }}
        >
          {children}
        </Box>
      </Popover>
    </>
  );
}
