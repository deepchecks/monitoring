import React, { Dispatch, SetStateAction, useState } from 'react';
import dayjs from 'dayjs';
import mixpanel from 'mixpanel-browser';

import useModels from 'hooks/useModels';

import {
  AlertRuleInfoSchema,
  AlertSchema,
  MonitorSchema,
  useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost
} from '../api/generated';

import LoadingButton from '@mui/lab/LoadingButton';
import {
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  styled,
  Typography,
  useTheme
} from '@mui/material';

import { OperatorsEnumMap } from '../helpers/conditionOperator';
import processFrequency from '../helpers/utils/processFrequency';

import { Checkmark, CloseIcon, TestTube } from '../assets/icon/icon';
import { ChartSvg } from 'assets/icon/chart';

interface AlertsDrawerHeaderProps {
  alertIndex: number;
  alerts: AlertSchema[];
  alertRule: AlertRuleInfoSchema;
  changeAlertIndex: Dispatch<SetStateAction<number>>;
  onResolve: () => void;
  onClose: () => void;
  monitor: MonitorSchema | null;
}

const titles = ['Check:', 'Model:', 'Feature:', 'Segment:', 'Frequency:'];

export const AlertsDrawerHeader = ({
  alertIndex,
  alerts,
  alertRule,
  changeAlertIndex,
  onResolve,
  onClose,
  monitor
}: AlertsDrawerHeaderProps) => {
  const { alert_severity, condition } = alertRule;

  const { mutateAsync: mutateRunSuit, isLoading } =
    useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost();

  const theme = useTheme();
  const { modelsMap } = useModels();

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

  const alert = alerts[alertIndex];

  const info: string[] = [
    monitor?.check?.name || '',
    modelsMap[alertRule.model_id].name,
    monitor?.additional_kwargs?.res_conf ? monitor?.additional_kwargs?.res_conf[0] : 'N/A',
    monitor?.data_filters ? `${monitor?.data_filters.filters[0].column}` : 'N/A',
    monitor?.frequency ? processFrequency(dayjs.duration(monitor?.frequency, 'seconds')) : 'N/A'
  ];

  const { color, ...criticalityRange } = criticalityMap[alert_severity!];

  const runTest = async (modelVersionId: string) => {
    const result = await mutateRunSuit({
      modelVersionId: parseInt(modelVersionId),
      data: {
        start_time: alert?.start_time,
        end_time: alert?.end_time,
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
    mixpanel.track('Run test suite click');

    const [modelVersionId] = Object.keys(alert.failed_values);
    runTest(modelVersionId);
  };

  const closeDrawer = () => {
    changeAlertIndex(0);
    onClose();
  };

  return (
    <StyledMainWrapper>
      <Box width={1}>
        <StyledTopSection>
          <Stack direction="row" spacing="20px" alignItems="center">
            <Box
              sx={{
                padding: '10px 8px 5px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: color,
                borderRadius: '10px'
              }}
            >
              <ChartSvg {...criticalityRange} width={27} height={26} />
              <Typography
                sx={{
                  fontSize: '16px',
                  lineHeight: '150%',
                  display: 'flex',
                  alignItems: 'center',
                  textAlign: 'center',
                  letterSpacing: '-0.9px',
                  fontWeight: 700,
                  color: theme => theme.palette.common.white,
                  marginTop: '10px'
                }}
              >
                {dayjs(alert.start_time).format('DD.MM.YYYY')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4">{monitor?.name} Alert</Typography>
              <Typography variant="body1" marginTop="8px">
                {`Rule: Value ${OperatorsEnumMap[condition.operator]} ${condition.value}`}
              </Typography>
            </Box>
          </Stack>
          <StyledIconButton onClick={closeDrawer}>
            <CloseIcon />
          </StyledIconButton>
        </StyledTopSection>
        <Divider
          sx={theme => ({
            border: `1px dashed ${theme.palette.grey[300]}`,
            margin: '16px 0 16px 0'
          })}
        />
        <StyledBottomSection>
          <StyledFlexWrapper>
            {titles.map((title, index) => (
              <Box
                key={title}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 0'
                }}
              >
                <Typography variant="subtitle2" color="text.disabled">
                  {title}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: 'text.disabled',
                    fontWeight: 700,
                    marginLeft: '4px',
                    '&:last-child': { marginRight: '5px' }
                  }}
                >
                  {info[index]}
                </Typography>
                {titles.length - 1 !== index && (
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ margin: '0 10px', height: '10px', alignSelf: 'center', borderColor: 'text.disabled' }}
                  />
                )}
              </Box>
            ))}
          </StyledFlexWrapper>
          <Stack direction="row" spacing="20px" alignItems="start">
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
                  <MenuItem value={key} key={key}>
                    Version {key}
                  </MenuItem>
                ))}
              </StyledSelect>
            ) : (
              <StyledButtonResolve
                variant="outlined"
                disabled={alert?.resolved}
                onClick={onResolve}
                startIcon={<Checkmark />}
              >
                Resolve Alert
              </StyledButtonResolve>
            )}
            <StyledButtonTest
              size="small"
              color="secondary"
              loading={isLoading}
              loadingPosition="start"
              variant="contained"
              onClick={handleRunSuite}
              startIcon={<TestTube />}
            >
              Run Test Suite
            </StyledButtonTest>
          </Stack>
        </StyledBottomSection>
      </Box>
    </StyledMainWrapper>
  );
};

const StyledMainWrapper = styled(Box)({
  padding: '16px 40px 16px 40px'
});

const StyledTopSection = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%'
});

const StyledFlexWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  maxWidth: 700
});

const StyledIconButton = styled(IconButton)({
  background: 'transparent'
});

const StyledBottomSection = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between'
});

const StyledButtonResolve = styled(Button)({
  width: 160,
  padding: '0 8px',
  minHeight: 36
});

const StyledButtonTest = styled(LoadingButton)({
  width: 166,
  padding: 0,
  minHeight: 36
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
