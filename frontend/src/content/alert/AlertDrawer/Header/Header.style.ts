import {
  Box,
  Button,
  Divider,
  IconButton,
  Select,
  styled,
  Typography,
} from "@mui/material";

export const StyledMainWrapper = styled(Box)({
  display: "flex",
  padding: "15px 36px 0 16px",
});

interface StyledCriticalityProps {
  bgColor: string;
}

export const StyledCriticalityTop = styled(Box, {
  shouldForwardProp: (prop) => prop !== "bgColor",
})<StyledCriticalityProps>(({ bgColor }) => ({
  width: 46,
  height: 70,
  borderRadius: "1000px 0 0 0",
  backgroundColor: bgColor,
}));

export const StyledCriticality = styled(Box, {
  shouldForwardProp: (prop) => prop !== "bgColor",
})<StyledCriticalityProps>(({ bgColor, theme }) => ({
  width: 46,
  height: 108,
  backgroundColor: bgColor,
  borderRadius: "0 0 1000px 1000px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "end",
  alignItems: "center",
  padding: "34px 6px",
  color: theme.palette.common.white,
}));

export const StyledCaption = styled(Typography)({
  marginTop: "5px",
});

export const StyledTopSection = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "9px 0 0 22px",
  width: "100%",
});

export const StyledDate = styled(Typography)({
  marginTop: "5px",
});

export const StyledFlexWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const StyledIconButton = styled(IconButton)({
  background: "transparent",
});

export const StyledTypographyCount = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  margin: "0 8px",
}));

export const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[200],
  margin: "0 24px",
}));

export const StyledDividerDashed = styled(Divider)(({ theme }) => ({
  border: `1px dashed ${theme.palette.grey[300]}`,
  margin: "18px 3px 22px 12px",
}));

export const StyledBottomSection = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  margin: "0 1px 0 18px",
});

export const StyledPropertyWrapper = styled(Box)({
  margin: "0 22.5px",
  ":first-of-type": {
    marginLeft: 0,
  },
  ":last-of-type": {
    marginRight: 0,
  },
});

export const StyledTypographyTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.disabled,
  fontWeight: 500,
  fontSize: 12,
  lineHeight: "140%",
  letterSpacing: "1px",
  textTransform: "uppercase",
}));

export const StyledTypographyProperty = styled(Typography)({
  marginTop: "5px",
});

export const StyledButtonWrapper = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: 328,
});

export const StyledButtonResolve = styled(Button)({
  width: 138,
  padding: 0,
});

export const StyledButtonTest = styled(Button)({
  width: 170,
});

export const StyledTypographySelect = styled(Typography)({
  fontWeight: 500,
  fontSize: 14,
  letterSpacing: "1px",
  lineHeight: 2.66,
});

export const StyledSelect = styled(Select)(({ theme }) => ({
  minWidth: 170,
  height: 36,
  color: theme.palette.primary.main,

  "&.Mui-focused": {
    background: `${theme.palette.primary.light}`,
  },

  "& .MuiSelect-icon": {
    color: theme.palette.primary.main,
  },

  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: `${theme.palette.primary.main} !important`,
    borderWidth: 1,
  },
}));
