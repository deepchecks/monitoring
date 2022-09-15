import { Stack, Typography } from '@mui/material';
import React, { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { theme } from 'theme';
import { pathsInfo } from 'helpers/helper';
import groupBy from 'lodash/groupBy';

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
        padding: ' 20px 0',
        width: '100%',
        borderBottom: `1px dashed ${theme.palette.grey[300]}`
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: '34px', letterSpacing: '0.6px', lineHeight: '40px' }}>
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
