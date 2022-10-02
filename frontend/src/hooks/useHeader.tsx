import { Stack, Typography } from '@mui/material';
import { pathsInfo } from 'helpers/helper';
import groupBy from 'lodash/groupBy';
import React, { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { theme } from 'theme';

export type HeaderProvider = {
  children: JSX.Element;
};

export interface HeaderContext {
  setChildren: React.Dispatch<React.SetStateAction<React.ReactNode>>;
  Header: React.FC;
}
const HeaderContext = createContext<HeaderContext | null>(null);

const useHeader = () => {
  const context = useContext(HeaderContext);
  if (context === null) throw Error('HeaderContext is null');

  return context;
};

export const HeaderProvider = ({ children }: HeaderProvider): JSX.Element => {
  const location = useLocation();
  const [headerChildren, setHeaderChildren] = React.useState<React.ReactNode | null>(null);
  const pathsGroupedByPath = groupBy(
    pathsInfo.flatMap(pathInfo => [pathInfo, ...(pathInfo.children ?? [])]),
    'link'
  );

  const path = location.pathname;
  const pathInfo = pathsGroupedByPath[path];

  const Header = () => (
    <Stack
      component="header"
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        padding: ' 21px 0',
        width: '100%',
        borderBottom: `1px dotted ${theme.palette.grey[300]}`
      }}
    >
      <Typography variant="h4" sx={{ color: theme => theme.palette.text.disabled }}>
        {pathInfo[0]?.title}
      </Typography>
      {headerChildren}
    </Stack>
  );

  const value = {
    setChildren: setHeaderChildren,
    Header
  };

  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
};

export default useHeader;
