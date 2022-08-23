import {
  Box,
  Button,
  Dialog,
  IconButton,
  styled,
  Typography,
} from "@mui/material";

export const StyledDialog = styled(Dialog)({
  "& .MuiPaper-root": {
    padding: "18px 12px 30px 30px",
    width: 500,
  },
});

export const StyledHeader = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const StyledIconButton = styled(IconButton)({
  background: "transparent",
});

export const StyledTypographyMessage = styled(Typography)({
  margin: "55px 0 56px",
});

export const StyledButtonWrapper = styled(Box)({
  display: "flex",
  justifyContent: "end",
});

export const StyledButtonContinue = styled(Button)({
  width: 158,
});
