import { alpha, Components, Theme } from '@mui/material';
// import type {} from "@mui/x-date-pickers/themeAugmentation";
import React from 'react';
import { CheckboxDefault, CheckboxSelected } from '../assets/icon/icon';
import { colors } from './colors';

export const componentOptions: Components<Theme> = {
  MuiButton: {
    defaultProps: {
      variant: 'contained',
      color: 'primary'
    },
    styleOverrides: {
      root: ({ theme }) => ({
        textTransform: 'none',
        color: theme.palette.common.white,
        borderRadius: '2px',
        fontSize: 14,
        width: 'max-content',
        boxShadow:
          '0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 5px 8px rgba(0, 0, 0, 0.14), 0px 1px 14px rgba(0, 0, 0, 0.12)',
        transition: 'all 0.3s ease'
      }),
      sizeLarge: {
        padding: '0 21px',
        minHeight: 42,
        minWidth: 92
      },
      sizeMedium: {
        padding: '0 13px',
        lineHeight: 2,
        minHeight: 36,
        minWidth: 88
      },
      sizeSmall: {
        padding: '0 11px',
        lineHeight: 2,
        minHeight: 30,
        minWidth: 70
      },
      contained: ({ theme }) => ({
        background: theme.palette.primary.main,
        ':hover': {
          background: theme.palette.primary.dark
        },
        ':disabled': {
          background: theme.palette.grey[100],
          color: theme.palette.grey[300],
          boxShadow: 'none'
        }
      }),
      outlined: ({ theme }) => ({
        background: alpha(theme.palette.common.white, 0.7),
        border: `1px solid ${theme.palette.primary.main}`,
        color: theme.palette.primary.dark,
        ':hover': {
          color: theme.palette.primary.main,
          background: theme.palette.primary.light
        },
        ':disabled': {
          background: alpha(theme.palette.common.white, 0.7),
          color: theme.palette.grey[200],
          border: `1px solid ${theme.palette.grey[200]}`,
          boxShadow: 'none'
        }
      }),
      text: ({ theme }) => ({
        fontSize: 15,
        lineHeight: '26px',
        background: 'none',
        letterSpacing: '0.46px',
        boxShadow: 'none',
        color: theme.palette.primary.main,
        ':hover': {
          background: theme.palette.primary.light
        },
        ':disabled': {
          color: theme.palette.grey[200]
        }
      })
    }
  },
  MuiIconButton: {
    defaultProps: {
      color: 'primary',
      disableFocusRipple: false
    },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: '6px',
        transition: 'all 0.3s ease',
        background: '#F3F5F8',
        ':hover': {
          background: theme.palette.primary.light
        },
        ':active': {
          background: theme.palette.primary.light
        },
        '& svg': {
          color: theme.palette.primary.light
        }
      }),
      sizeLarge: {
        padding: '9px'
      },
      sizeMedium: {
        padding: '6px'
      },
      sizeSmall: {
        padding: '5px'
      }
    }
  },
  MuiSlider: {
    styleOverrides: {
      root: ({ theme }) => ({
        '&.Mui-disabled': {
          color: theme.palette.grey[300]
        }
      }),
      markLabel: ({ theme }) => ({
        top: '36px',
        color: theme.palette.text.disabled,
        '&.MuiSlider-markLabelActive': {
          color: theme.palette.text.secondary
        }
      }),
      thumb: ({ theme }) => ({
        color: theme.palette.primary.dark,
        '&.Mui-disabled': {
          color: theme.palette.grey[300]
        },
        ':hover': {
          boxShadow: `0px 0px 0px 11px ${alpha(theme.palette.primary.main, 0.16)}`
        }
      }),
      sizeSmall: ({ theme }) => ({
        '& .MuiSlider-thumb': {
          ':hover': {
            boxShadow: `0px 0px 0px 10px ${alpha(theme.palette.primary.main, 0.16)}`
          }
        }
      })
    }
  },
  MuiSelect: {
    styleOverrides: {
      select: ({ theme }) => ({
        '&.Mui-focused': {
          color: theme.palette.primary.main
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: `${theme.palette.primary.main} !important`
        }
      }),
      icon: ({ theme }) => ({
        color: theme.palette.text.secondary,
        '& + .MuiOutlinedInput-notchedOutline': {
          border: `1px solid ${theme.palette.grey[200]}`
        }
      })
    }
  },
  MuiMenu: {
    styleOverrides: {
      list: {
        padding: '6px 0 10px',
        maxHeight: 480
      }
    }
  },
  MuiCheckbox: {
    defaultProps: {
      icon: <CheckboxDefault />,
      checkedIcon: <CheckboxSelected />
    },
    styleOverrides: {
      root: ({ theme }) => ({
        '&.Mui-disabled svg': {
          stroke: theme.palette.grey[300]
        },
        '& svg': {
          stroke: theme.palette.text.primary
        },
        padding: '3px'
      })
    }
  },
  MuiSwitch: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: '7px',
        height: 24,
        width: 40,
        overflow: 'visible',
        '& 	.Mui-checked + .MuiSwitch-track': {
          backgroundColor: theme.palette.primary.contrastText,
          opacity: 1
        }
      }),
      switchBase: ({ theme }) => ({
        padding: '4px',
        color: theme.palette.grey[100]
      }),
      thumb: {
        width: 16,
        height: 16,
        boxShadow:
          '0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px rgba(0, 0, 0, 0.14), 0px 1px 3px rgba(0, 0, 0, 0.12)'
      },
      track: ({ theme }) => ({
        opacity: 1,
        backgroundColor: theme.palette.text.disabled
      })
    }
  },
  MuiTooltip: {
    styleOverrides: {
      arrow: {
        color: colors.neutral.blue[100]
      },
      tooltip: {
        padding: '4px 16px',
        backgroundColor: colors.neutral.blue[100],
        fontSize: 16,
        lineHeight: '24px',
        letterSpacing: '0.15px',
        fontWeight: 400
      }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: ({ theme }) => ({
        height: 28,
        backgroundColor: colors.neutral.blue[100],
        color: theme.palette.common.white,
        fontSize: 12,
        lineHeight: '18px',
        letterSpacing: '0.1px'
      }),
      label: {
        padding: '0 7px 0 10px'
      },
      deletable: ({ theme }) => ({
        '& .MuiChip-deleteIcon': {
          margin: '0 7px 0 0',
          width: 16,
          height: 16,
          opacity: 0.7,
          color: theme.palette.common.white,

          ':hover': {
            color: theme.palette.common.white,
            opacity: 1
          }
        }
      })
    }
  },
  MuiBreadcrumbs: {
    styleOverrides: {
      separator: ({ theme }) => ({
        margin: '0 10px',
        color: theme.palette.text.primary
      })
    }
  },
  // MuiDatePicker: {
  //   styleOverrides: {
  //     root: {
  //       backgroundColor: "red",
  //       "& button": {
  //         backgroundColor: "black",
  //       },
  //     },
  //   },
  // },
  MuiFormControl: {
    styleOverrides: {
      root: ({ theme }) => ({
        '& .Mui-disabled': {
          opacity: 0.35
        },
        '& label': {
          color: theme.palette.text.primary
        },
        '& .MuiInputLabel-shrink': {
          color: theme.palette.text.disabled
        }
      })
    }
  }
};
