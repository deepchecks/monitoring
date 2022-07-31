import { Stack, styled } from "@mui/material";

interface StyledBoxWrapperProps {
  view: number;
}

export const StyledBoxWrapper = styled(Stack)<StyledBoxWrapperProps>(
  ({ view }) => ({
    alignItems: "center",
    justifyContent: "space-between",
    position: "fixed",
    background: "#17003E",
    width: view > 1381 ? "237px" : "83px",
    height: "100vh",
  })
);
