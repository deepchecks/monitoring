import React, { useContext, PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import groupBy from 'lodash/groupBy';

import { GlobalStateContext } from 'context';

import { Stack, Typography } from '@mui/material';

import { theme } from 'theme';

interface HeaderLayoutProps {
  title?: string;
}

const HeaderLayout = ({ title, children }: PropsWithChildren<HeaderLayoutProps>) => {
  const location = useLocation();
  const { pathsInfo } = useContext(GlobalStateContext);

  const pathsGroupedByPath = groupBy(
    pathsInfo.flatMap(pathInfo => [pathInfo, ...(pathInfo.children ?? [])]),
    'link'
  );

  const path = location.pathname;
  const pathInfo = pathsGroupedByPath[path];

  return (
    <Stack
      component="header"
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        padding: ' 21px 0',
        width: '100%',
        height: 83,
        borderBottom: `1px dashed ${theme.palette.grey[300]}`
      }}
    >
      <Typography variant="h4" sx={{ color: theme => theme.palette.text.disabled }}>
        {title || pathInfo[0]?.title}
      </Typography>
      {children}
    </Stack>
  );
};

export default HeaderLayout;
