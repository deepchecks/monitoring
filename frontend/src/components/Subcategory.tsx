import React, { ReactNode } from 'react';

import { Box, BoxProps, styled } from '@mui/material';

interface SubcategoryProps extends BoxProps {
  children: ReactNode;
}

export function Subcategory({ children, ...otherProps }: SubcategoryProps) {
  return (
    <Box display="flex" {...otherProps}>
      <StyledSubCategory />
      <StyledChildrenContainer>{children}</StyledChildrenContainer>
    </Box>
  );
}

const StyledSubCategory = styled(Box)(({ theme }) => ({
  height: '52px',
  margin: '24px 24px 0 0',
  borderLeft: `2px solid ${theme.palette.primary.main}`
}));

const StyledChildrenContainer = styled(Box)({
  width: '100%',
  marginTop: '24px'
});
