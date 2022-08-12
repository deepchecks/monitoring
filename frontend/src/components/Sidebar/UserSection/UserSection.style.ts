import {
  Box,
  Divider,
  Menu,
  MenuItem,
  styled,
  Typography,
} from "@mui/material";

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
  borderRadius: "20px 0px 0px 20px",
  cursor: "pointer",
  color: "#fff",
  "& svg": {
    fill: "white",
  },
  "&:hover": {
    color: "#B17DFF",
  },
  "&:hover svg": {
    fill: "#B17DFF",
  },
  "&:hover img": {
    borderColor: "#B17DFF",
  },
  "&:active": {
    color: "#B17DFF",
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

export const StyledMenuItem = styled(MenuItem)({
  minWidth: 244,
  padding: "12px",
});

export const StyledMenu = styled(Menu)({
  "& .MuiPaper-root": {
    marginLeft: "-20px",
  },
});

export const StyledDivider = styled(Divider)(({ theme }) => ({
  margin: "14px 0 9px !important",
  borderColor: theme.palette.grey[100],
}));
