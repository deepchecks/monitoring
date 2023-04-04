import React, { ReactNode } from 'react';

import { Box, BoxProps, styled } from '@mui/material';

interface SubcategoryProps extends BoxProps {
  children: ReactNode;
}

export function Subcategory({ children, sx, component, ref }: SubcategoryProps) {
  return (
    <Box display="flex" sx={sx} component={component} ref={ref}>
      <StyledSubCategory />
      <StyledChildrenContainer>{children}</StyledChildrenContainer>
    </Box>
  );
}

const StyledSubCategory = styled(Box)(({ theme }) => ({
  margin: '9px 8px 0 6px',
  width: 26,
  height: 50,
  borderLeft: `1px solid ${theme.palette.grey[200]}`,
  borderBottom: `1px solid ${theme.palette.grey[200]}`,
  position: 'relative',

  '::after': {
    position: 'absolute',
    display: 'block',
    content: "''",
    right: '-2px',
    bottom: '-2px',
    width: 4,
    height: 4,
    backgroundColor: theme.palette.grey[200],
    borderRadius: '50%'
  }
}));

const StyledChildrenContainer = styled(Box)({
  width: '100%',
  marginTop: '38px'
});
