import React, { Dispatch, SetStateAction, useMemo } from 'react';
import dayjs from 'dayjs';

import {
  AlertRuleInfoSchema,
  AlertSchema,
  ModelManagmentSchema,
  MonitorSchema,
  SingleCheckRunOptions
} from 'api/generated';

import { Box, Button, Divider, IconButton, Stack, styled, Typography, useTheme } from '@mui/material';

import { RunDownloadSuite } from 'components/RunDownloadSuite';
import { ShareButton } from 'components/ShareButton';

import { OperatorsEnumMap } from 'helpers/conditionOperator';
import processFrequency from 'helpers/utils/processFrequency';

import { Checkmark, CloseIcon } from 'assets/icon/icon';
import { ChartSvg } from 'assets/icon/chart';

interface AlertsDrawerHeaderProps {
  alertIndex: number;
  alerts: AlertSchema[];
  alertRule: AlertRuleInfoSchema;
  changeAlertIndex: Dispatch<SetStateAction<number>>;
  onResolve: () => void;
  onClose: () => void;
  monitor: MonitorSchema | null;
  modelVersionId: number | undefined;
  alert: AlertSchema;
  singleCheckRunOptions: SingleCheckRunOptions;
  currentModel: ModelManagmentSchema | null;
}

const titles = ['Check:', 'Model:', 'Feature:', 'Segment:', 'Frequency:'];

export const AlertsDrawerHeader = ({
  alertRule,
  changeAlertIndex,
  onResolve,
  onClose,
  monitor,
  modelVersionId,
  alert,
  singleCheckRunOptions,
  currentModel
}: AlertsDrawerHeaderProps) => {
  const theme = useTheme();

  const criticalityMap = useMemo(
    () => ({
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
    }),
    [theme.palette]
  );

  const info: string[] = useMemo(
    () => [
      monitor?.check?.name || '',
      currentModel?.name || '',
      monitor?.additional_kwargs?.res_conf ? monitor?.additional_kwargs?.res_conf[0] : 'N/A',
      monitor?.data_filters ? `${monitor?.data_filters.filters[0].column}` : 'N/A',
      monitor?.frequency ? processFrequency(dayjs.duration(monitor?.frequency, 'seconds')) : 'N/A'
    ],
    [currentModel, monitor]
  );

  const { alert_severity, condition } = alertRule;
  const { color, ...criticalityRange } = criticalityMap[alert_severity || 'low'];

  const closeDrawer = () => {
    changeAlertIndex(0);
    onClose();
  };

  return (
    <Box sx={{ marginBottom: '16px' }}>
      <Box width={1}>
        <StyledTopSection>
          <Stack direction="row" spacing="20px" alignItems="center" flexGrow={1}>
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
                {dayjs(alert.end_time).format('DD.MM.YYYY')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4">{monitor?.name} Alert</Typography>
              <Typography variant="body1" marginTop="8px">
                {`Rule: Value ${OperatorsEnumMap[condition.operator]} ${condition.value}`}
              </Typography>
            </Box>
          </Stack>
          <ShareButton onlyIcon={true} />
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
            <StyledButtonResolve
              variant="outlined"
              disabled={alert?.resolved}
              onClick={onResolve}
              startIcon={<Checkmark />}
            >
              Resolve Alert
            </StyledButtonResolve>
            <RunDownloadSuite
              testSuiteButtonLabel="Run Test Suite"
              modelVersionId={modelVersionId}
              notebookType="monitor"
              notebookId={monitor?.id}
              notebookName={monitor?.name}
              singleCheckRunOptions={singleCheckRunOptions}
            />
          </Stack>
        </StyledBottomSection>
      </Box>
    </Box>
  );
};

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
