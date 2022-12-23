import React from 'react';

import { StyledFlexWrapper, StyledSubCategory, StyledChildrenWrapper } from '../MonitorDrawer.style';

import { SubcategoryProps } from '../MonitorDrawer.types';

export function Subcategory({ children }: SubcategoryProps) {
  return (
    <StyledFlexWrapper>
      <StyledSubCategory />
      <StyledChildrenWrapper>{children}</StyledChildrenWrapper>
    </StyledFlexWrapper>
  );
}
