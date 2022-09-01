import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Select,
  Typography,
  MenuItem,
  SelectChangeEvent,
  styled,
  useTheme
} from '@mui/material';
import dayjs from 'dayjs';
import { ChartSvg } from '../assets/icon/chart';
import { CloseIcon, FastForward, Rewind } from '../assets/icon/icon';
import {
  AlertRuleInfoSchema,
  useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost
} from '../api/generated';
import { ConditionOperator, conditionOperatorMap } from '../helpers/conditionOperator';
import { Loader } from './Loader';
interface AlertsDrawerHeaderProps {
  alertRule: AlertRuleInfoSchema;
  onResolve: () => void;
  onClose: () => void;
}

const titles = ['Model', 'Check', 'Feature', 'Condition', 'Frequency'];

export const AlertsDrawerHeader = ({ alertRule, onResolve, onClose }: AlertsDrawerHeaderProps) => {
  const { name, alert_severity, condition, repeat_every } = alertRule;

  const { data: alerts = [], isLoading: isAlertsLoading } = useGetAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet(
    alertRule.id
  );
  const { data: monitor = null, isLoading: isMonitorLoading } = useGetMonitorApiV1MonitorsMonitorIdGet(
    alertRule.monitor_id
  );

  const isLoading = isAlertsLoading || isMonitorLoading;

  const { mutateAsync: mutateRunSuit } = useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost();

  const [alertIndex, setAlertIndex] = useState(0);
  const theme = useTheme();

  const [modelVersionId, setModelVersionId] = useState<string>('');

  const [criticalityMap] = useState({
    low: {
      color: theme.palette.error.contrastText
    },
    mid: {
      color: theme.palette.error.light,
      first: true
    },
    high: {
      color: theme.palette.error.dark,
      first: true,
      second: true
    },
    critical: {
      color: theme.palette.error.main,
      first: true,
      second: true,
      third: true
    }
  });

  if (isLoading) return <Loader />;

  const alert = alerts[alertIndex];

  const info = [
    name,
    monitor?.check?.name,
    '-',
    `Value ${conditionOperatorMap[condition.operator as ConditionOperator]} ${condition.value}`,
    repeat_every === 86400 ? 'Day' : repeat_every
  ];

  const { color, ...criticalityRange } = criticalityMap[alert_severity!];

  const prevAlert = () => {
    setAlertIndex(prevIndex => prevIndex - 1);
  };

  const nextAlert = () => {
    setAlertIndex(prevIndex => prevIndex + 1);
  };

  const runTest = async (modelVersionId: string) => {
    const result = await mutateRunSuit({
      modelVersionId: parseInt(modelVersionId),
      data: {
        start_time: alert.start_time,
        end_time: alert.end_time,
        filter: monitor!.data_filters
      }
    });

    const winUrl = URL.createObjectURL(new Blob([result], { type: 'text/html' }));
    window.open(winUrl);
  };

  const handleModelVersionIdChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    runTest(value);
    setModelVersionId(value);
  };

  const handleRunSuite = () => {
    const [modelVersionId] = Object.keys(alert.failed_values);
    runTest(modelVersionId);
  };

  return (
    <StyledMainWrapper>
      <Box>
        <StyledCriticalityTop bgColor={color} />
        <StyledCriticality bgColor={color}>
          <ChartSvg {...criticalityRange} width={18} height={16} />
          <StyledCaption variant="caption">{alert_severity}</StyledCaption>
        </StyledCriticality>
      </Box>
      <Box width={1}>
        <StyledTopSection>
          <Box>
            <Typography variant="h4">{name}</Typography>
            <StyledDate variant="subtitle2">Alert date: {dayjs(alert?.created_at).format('MMM. DD, YYYY')}</StyledDate>
          </Box>
          <StyledFlexWrapper>
            <StyledFlexWrapper>
              <StyledIconButton disabled={!alertIndex} onClick={prevAlert}>
                <Rewind />
              </StyledIconButton>
              <StyledTypographyCount variant="body1">
                Alert #{alertIndex + 1}/{alerts.length}
              </StyledTypographyCount>
              <StyledIconButton disabled={alertIndex + 1 === alerts.length} onClick={nextAlert}>
                <FastForward />
              </StyledIconButton>
            </StyledFlexWrapper>
            <StyledDivider orientation="vertical" flexItem />
            <StyledIconButton onClick={onClose}>
              <CloseIcon />
            </StyledIconButton>
          </StyledFlexWrapper>
        </StyledTopSection>
        <StyledDividerDashed />
        <StyledBottomSection>
          <StyledFlexWrapper>
            {titles.map((title, index) => (
              <StyledPropertyWrapper key={title}>
                <StyledTypographyTitle>{title}</StyledTypographyTitle>
                <StyledTypographyProperty variant="subtitle2">{info[index]}</StyledTypographyProperty>
              </StyledPropertyWrapper>
            ))}
          </StyledFlexWrapper>
          <StyledButtonWrapper>
            {alert?.failed_values && Object.keys(alert.failed_values).length > 1 ? (
              <StyledSelect
                size="small"
                variant="outlined"
                displayEmpty
                onChange={handleModelVersionIdChange}
                value={modelVersionId}
                renderValue={value => <Typography>{value ? `Version ${value}` : 'RUN TEST SUITE'}</Typography>}
              >
                {Object.keys(alert.failed_values).map(key => (
                  <MenuItem value={key}>Version {key}</MenuItem>
                ))}
              </StyledSelect>
            ) : (
              <StyledButtonTest variant="outlined" onClick={handleRunSuite}>
                Run Test Suite
              </StyledButtonTest>
            )}

            <StyledButtonResolve variant="contained" disabled={alert?.resolved} onClick={onResolve}>
              Resolve Alert
            </StyledButtonResolve>
          </StyledButtonWrapper>
        </StyledBottomSection>
      </Box>
    </StyledMainWrapper>
  );
};

const StyledMainWrapper = styled(Box)({
  display: 'flex',
  padding: '15px 36px 0 16px'
});

interface StyledCriticalityProps {
  bgColor: string;
}

const StyledCriticalityTop = styled(Box, {
  shouldForwardProp: prop => prop !== 'bgColor'
})<StyledCriticalityProps>(({ bgColor }) => ({
  width: 46,
  height: 70,
  borderRadius: '1000px 0 0 0',
  backgroundColor: bgColor
}));

const StyledCriticality = styled(Box, {
  shouldForwardProp: prop => prop !== 'bgColor'
})<StyledCriticalityProps>(({ bgColor, theme }) => ({
  width: 46,
  height: 108,
  backgroundColor: bgColor,
  borderRadius: '0 0 1000px 1000px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'end',
  alignItems: 'center',
  padding: '34px 6px',
  color: theme.palette.common.white
}));

const StyledCaption = styled(Typography)({
  marginTop: '5px'
});

const StyledTopSection = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '9px 0 0 22px',
  width: '100%'
});

const StyledDate = styled(Typography)({
  marginTop: '5px'
});

const StyledFlexWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
});

const StyledIconButton = styled(IconButton)({
  background: 'transparent'
});

const StyledTypographyCount = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  margin: '0 8px'
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  borderColor: theme.palette.grey[200],
  margin: '0 24px'
}));

const StyledDividerDashed = styled(Divider)(({ theme }) => ({
  border: `1px dashed ${theme.palette.grey[300]}`,
  margin: '18px 3px 22px 12px'
}));

const StyledBottomSection = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: '0 1px 0 18px'
});

const StyledPropertyWrapper = styled(Box)({
  margin: '0 22.5px',
  ':first-of-type': {
    marginLeft: 0
  },
  ':last-of-type': {
    marginRight: 0
  }
});

const StyledTypographyTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.disabled,
  fontWeight: 500,
  fontSize: 12,
  lineHeight: '140%',
  letterSpacing: '1px',
  textTransform: 'uppercase'
}));

const StyledTypographyProperty = styled(Typography)({
  marginTop: '5px'
});

const StyledButtonWrapper = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: 328
});

const StyledButtonResolve = styled(Button)({
  width: 138,
  padding: 0
});

const StyledButtonTest = styled(Button)({
  width: 170
});

const StyledTypographySelect = styled(Typography)({
  fontWeight: 500,
  fontSize: 14,
  letterSpacing: '1px',
  lineHeight: 2.66
});

const StyledSelect = styled(Select)(({ theme }) => ({
  minWidth: 170,
  height: 36,
  color: theme.palette.primary.main,

  '&.Mui-focused': {
    background: `${theme.palette.primary.light}`
  },

  '& .MuiSelect-icon': {
    color: theme.palette.primary.main
  },

  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: `${theme.palette.primary.main} !important`,
    borderWidth: 1
  }
}));
