import React from 'react';

import { Typography, Menu, MenuItem, MenuProps } from '@mui/material';

interface DownloadSuiteDropdownProps extends MenuProps {
  downloadNotebook: (asScript?: 'as script') => Promise<void>;
}

export const DownloadSuiteDropdown = ({ downloadNotebook, ...props }: DownloadSuiteDropdownProps) => (
  <Menu
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right'
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right'
    }}
    MenuListProps={{
      'aria-labelledby': 'basic-button'
    }}
    sx={{
      marginTop: '9px'
    }}
    {...props}
  >
    <MenuItem onClick={() => downloadNotebook()}>
      <Typography>Download notebook</Typography>
    </MenuItem>
    <MenuItem onClick={() => downloadNotebook('as script')}>
      <Typography>Download Python code</Typography>
    </MenuItem>
  </Menu>
);
