import { Box, Link, styled, Typography } from "@mui/material";

export const StyledLinkHome = styled(Link)({
  textDecoration: "none",
});

export const StyledLink = styled(Link)(({ theme }) => ({
  textDecorationColor: theme.palette.text.disabled,

  ":hover": {
    textDecorationColor: theme.palette.text.disabled,
  },
}));

interface StyledTypographyHome {
  fontWeight?: number;
}

export const StyledTypographyHome = styled(Typography)<StyledTypographyHome>(
  ({ fontWeight = 600, theme }) => ({
    fontWeight,
    marginLeft: "9px",
    color: theme.palette.text.disabled,
  })
);

export const StyledFlexWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
});

export const StyledTypographyCurrentPath = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 700,
}));
