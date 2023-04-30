import { Box, TextField, styled, Button, alpha } from '@mui/material';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';

const OPACITY = 0.4;

const StyledTextField = styled(TextField)({
  '.MuiInputBase-root, .MuiOutlinedInput-input': {
    cursor: 'pointer'
  },
  '.MuiOutlinedInput-root': {
    fontSize: '14px'
  }
});

const sharedDatePickerStyles = (primaryColor: string, secondaryColor: string) => ({
  '& .MuiPickersToolbar-root': {
    display: 'none'
  },

  '& .MuiPickersCalendarHeader-label': {
    fontWeight: 600,
    color: secondaryColor
  },

  '& .MuiButtonBase-root': {
    fontWeight: 700,
    color: secondaryColor
  },

  '& .MuiPickersLayout-toolbar': {
    backgroundColor: primaryColor,
    paddingBottom: 0,

    '& > span': {
      display: 'none'
    },

    '& .MuiTypography-root': {
      color: secondaryColor
    },

    '& .Mui-selected': {
      opacity: 1
    }
  },

  '& .MuiDateCalendar-root': {
    backgroundColor: primaryColor,

    '& .MuiSvgIcon-root, .MuiTypography-root, .MuiPickersCalendarHeader-label': {
      color: secondaryColor
    },

    '& .MuiDayCalendar-monthContainer': {
      '& .MuiButtonBase-root': {
        color: secondaryColor
      },

      '& .MuiButtonBase-root:hover, .MuiPickersDay-today, .Mui-selected': {
        border: '1px solid',
        borderColor: secondaryColor,
        fontWeight: 800
      },

      '& .MuiPickersDay-today': {
        background: secondaryColor,
        color: primaryColor
      },

      '& .Mui-disabled': {
        opacity: OPACITY
      }
    }
  },

  '& .MuiPickersFadeTransitionGroup-root, .MuiYearCalendar-root': {
    maxHeight: '280px'
  },

  '& .MuiPickersYear-root': {
    '& .MuiPickersYear-yearButton': {
      color: alpha(secondaryColor, OPACITY),
      border: '1px solid transparent',

      '&:hover': {
        borderColor: secondaryColor,
        backgroundColor: 'transparent'
      }
    },

    '& .Mui-selected': {
      color: secondaryColor
    }
  },

  '& .MuiDialogActions-root': {
    display: 'none'
  }
});

const StyledStaticDatePicker = styled(StaticDatePicker)(({ theme }) => ({
  ...sharedDatePickerStyles(theme.palette.primary.main, theme.palette.common.white),

  '& .MuiTypography-root': {
    opacity: 1
  }
})) as typeof StaticDatePicker;

const StyledStaticDateTimePicker = styled(StaticDateTimePicker)(({ theme }) => {
  const purple = theme.palette.primary.main;
  const white = theme.palette.common.white;

  return {
    ...sharedDatePickerStyles(purple, white),

    '& .MuiTypography-root': {
      opacity: OPACITY
    },

    '& .MuiTabs-flexContainer, .MuiTimeClock-root': {
      backgroundColor: purple
    },

    '& .MuiTabs-flexContainer': {
      '& .MuiButtonBase-root': {
        color: white,
        opacity: OPACITY,
        padding: '22px 12px 18px'
      },

      '& .Mui-selected': {
        opacity: 1,
        fontWeight: 800
      }
    },

    '& .MuiTabs-indicator': {
      backgroundColor: white
    },

    '& .MuiDayCalendar-header': {
      '& .MuiTypography-root': {
        opacity: 1
      }
    },

    '& .MuiTimeClock-root': {
      padding: '41px 0',

      '& .MuiPickersArrowSwitcher-root': {
        transform: 'translateY(-4px)'
      },

      '& .MuiButtonBase-root': {
        color: white
      },

      '& .Mui-disabled': {
        opacity: OPACITY
      },

      '& .MuiClock-squareMask': {
        backgroundColor: white
      }
    }
  };
}) as typeof StaticDateTimePicker;

const StyledButtonContainer = styled(Box)(({ theme }) => ({
  paddingBottom: '16px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.palette.primary.main
}));

const StyledButton = styled(Button)(({ theme }) => ({
  fontSize: '14px',
  fontWeight: 700,
  width: '72px',
  height: '32px',
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.common.white,
  borderRadius: '28px',
  border: '1px solid transparent',

  '&:hover': {
    color: theme.palette.common.white,
    borderColor: theme.palette.common.white
  }
}));

export { StyledTextField, StyledStaticDateTimePicker, StyledButtonContainer, StyledButton, StyledStaticDatePicker };
