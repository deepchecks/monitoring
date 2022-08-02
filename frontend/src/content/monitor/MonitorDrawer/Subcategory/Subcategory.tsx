import { ReactNode } from "react";
import {
  StyledChildrenWrapper,
  StyledFlexWrapper,
  StyledSubCategory,
} from "./Subcategory.style";

interface SubcategoryProps {
  children: ReactNode;
}

export function Subcategory({ children }: SubcategoryProps) {
  return (
    <StyledFlexWrapper>
      <StyledSubCategory />
      <StyledChildrenWrapper>{children}</StyledChildrenWrapper>
    </StyledFlexWrapper>
  );
}
