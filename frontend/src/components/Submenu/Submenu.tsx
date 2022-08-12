import { ReactNode } from "react";
import { StyledList, StyledPaper } from "./Submenu.style";

interface SubmenuProps {
  children: ReactNode;
  position?: "left" | "right";
  open: boolean;
}

export function Submenu({ children, open, position = "left" }: SubmenuProps) {
  if (!open) {
    return null;
  }

  return (
    <StyledPaper position={position}>
      <StyledList>{children}</StyledList>
    </StyledPaper>
  );
}
