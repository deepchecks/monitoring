import { alpha, Components, Theme } from "@mui/material";

export const componentOptions: Components<Theme> = {
  MuiButton: {
    defaultProps: {
      variant: "contained",
      color: "primary",
    },
    styleOverrides: {
      root: ({ theme }) => ({
        color: theme.palette.common.white,
        borderRadius: "2px",
        fontSize: 14,
        width: "max-content",
        boxShadow:
          "0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 5px 8px rgba(0, 0, 0, 0.14), 0px 1px 14px rgba(0, 0, 0, 0.12)",
        transition: "all 0.3s ease",
      }),
      sizeLarge: {
        padding: "0 21px",
        minHeight: 42,
        minWidth: 92,
      },
      sizeMedium: {
        padding: "0 13px",
        lineHeight: 2,
        minHeight: 36,
        minWidth: 88,
      },
      sizeSmall: {
        padding: "0 11px",
        lineHeight: 2,
        minHeight: 30,
        minWidth: 70,
      },
      contained: ({ theme }) => ({
        ":hover": {
          background: theme.palette.primary.dark,
        },
        ":disabled": {
          background: theme.palette.grey[100],
          color: theme.palette.grey[300],
          boxShadow: "none",
        },
      }),
      outlined: ({ theme }) => ({
        background: alpha(theme.palette.common.white, 0.7),
        color: theme.palette.primary.dark,
        ":hover": {
          background: theme.palette.primary.light,
        },
        ":disabled": {
          background: alpha(theme.palette.common.white, 0.7),
          color: theme.palette.grey[200],
          border: `1px solid ${theme.palette.grey[200]}`,
          boxShadow: "none",
        },
      }),
      text: ({ theme }) => ({
        fontSize: 15,
        lineHeight: "26px",
        background: "none",
        letterSpacing: "0.46px",
        boxShadow: "none",
        color: theme.palette.primary.dark,
        ":hover": {
          background: theme.palette.primary.light,
        },
        ":disabled": {
          color: theme.palette.grey[200],
        },
      }),
    },
  },
  MuiIconButton: {
    defaultProps: {
      color: "primary",
      disableFocusRipple: false,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: "6px",
        transition: "all 0.3s ease",
        ":hover": {
          background: theme.palette.primary.light,
        },
        ":active": {
          background: theme.palette.primary.light,
        },
        "& svg": {
          color: theme.palette.primary.light,
        },
      }),
      sizeLarge: {
        padding: "9px",
      },
      sizeMedium: {
        padding: "6px",
      },
      sizeSmall: {
        padding: "5px",
      },
    },
  },
  MuiSlider: {
    styleOverrides: {
      root: ({ theme }) => ({
        "&.Mui-disabled": {
          color: theme.palette.grey[300],
        },
      }),
      markLabel: ({ theme }) => ({
        top: "36px",
        color: theme.palette.text.disabled,
        "&.MuiSlider-markLabelActive": {
          color: theme.palette.text.secondary,
        },
      }),
      thumb: ({ theme }) => ({
        color: theme.palette.primary.dark,
        "&.Mui-disabled": {
          color: theme.palette.grey[300],
        },
        ":hover": {
          boxShadow: `0px 0px 0px 11px ${alpha(
            theme.palette.primary.main,
            0.16
          )}`,
        },
      }),
      sizeSmall: ({ theme }) => ({
        "& .MuiSlider-thumb": {
          ":hover": {
            boxShadow: `0px 0px 0px 10px ${alpha(
              theme.palette.primary.main,
              0.16
            )}`,
          },
        },
      }),
    },
  },
};
