import { List, Paper, styled } from "@mui/material";

interface StyledPaperProps {
  position: "left" | "right";
}

export const StyledPaper = styled(Paper)<StyledPaperProps>(({ position }) => {
  const style =
    position === "left"
      ? { marginLeft: "calc(-100% - 10px)" }
      : { marginleft: "10px" };

  return {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
    ...style,
  };
});

export const StyledList = styled(List)({
  padding: "6px 0 10px",
});
