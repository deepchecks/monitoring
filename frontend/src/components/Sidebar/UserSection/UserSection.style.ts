import { Box, styled, Typography } from "@mui/material";

export const StyledBoxContainer = styled(Box)({
  width: "100%",
  paddingBottom: "76px",
  paddingLeft: "30px",
  marginTop: "40px",
});

export const StyledBoxWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  height: "38px",
  borderRadius: "20px 0px 0px 20px",
  cursor: "pointer",
  color: "#fff",
  "&:hover": {
    color: "#B17DFF",
    fill: "#17003E",
  },
  "&:active": {
    color: "#B17DFF",
    fill: "#17003E",
  },
});

export const StyledImgBox = styled(Box)(({ theme }) => ({
  width: "36px",
  height: "36px",
  [theme.breakpoints.down(1381)]: {
    margin: "auto -4px",
  },
}));

export const StyledImage = styled("img")({
  width: 36,
  height: 36,
  borderRadius: "50%",
  borderWidth: "2px",
  borderColor: "rgba(255, 255, 255, 0.2)",
  borderStyle: "solid",
});

export const StyledTypography = styled(Typography)({
  fontSize: "14px",
  lineHeight: "120%",
  marginLeft: "14px",
});
