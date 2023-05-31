import React, { Dispatch, SetStateAction, useMemo, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import {
  AlertRuleInfoSchema,
  AlertSchema,
  ModelManagmentSchema,
  MonitorSchema,
  SingleCheckRunOptions,
  useResolveAlertApiV1AlertsAlertIdResolvePost,
  useGetAlertRulesApiV1AlertRulesGet,
  useReactivateAlertApiV1AlertsAlertIdReactivatePost,
  GetAlertRulesApiV1AlertRulesGetParams
} from 'api/generated';
import { getAlertFilters } from 'helpers/base/alertFilters';

import { Box, Button, Divider, IconButton, Stack, styled, Typography, useTheme, Tooltip } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';

import { RunDownloadSuite } from 'components/SuiteView/RunDownloadSuite';
import { ShareButton } from 'components/base/Button/ShareButton';
import { AlertsBadge } from './AlertBadge';
import { DiagramAlertCountWidget } from 'components/DiagramLine/DiagramAlertCountWidget/DiagramAlertCountWidget';
import { FullLengthTooltip } from 'components/DiagramLine/DiagramTutorialTooltip/DiagramTutorialTooltip';
import { AlertsSnackbar } from 'components/Alerts/AlertsSnackbar';

import { OperatorsEnumMap } from 'helpers/base/conditionOperator';
import processFrequency from 'helpers/utils/processFrequency';
import { FrequencyMap } from 'helpers/utils/frequency';

import { CloseIcon, Check } from 'assets/icon/icon';
import { useLocation } from 'react-router-dom';
import { theme } from 'components/lib/theme';

dayjs.extend(localizedFormat);

interface AlertsDrawerHeaderProps {
  alertIndex: number;
  alerts: AlertSchema[];
  setAlerts: Dispatch<SetStateAction<AlertSchema[]>>;
  alertRule: AlertRuleInfoSchema;
  changeAlertIndex: Dispatch<SetStateAction<number>>;
  onClose: () => void;
  monitor: MonitorSchema | null;
  modelVersionId: number | undefined;
  alert: AlertSchema;
  singleCheckRunOptions: SingleCheckRunOptions;
  currentModel: ModelManagmentSchema | null;
  resolved?: boolean;
}

const SNACKBAR_POSITION = {
  vertical: 'bottom',
  horizontal: 'right'
} as const;

const MAX_CHARACTERS = 27;
const LABEL_VALUE_TITLE_MAX_CHARACTERS = 25;

const DEFAULT_INFO_TITLES = ['Check:', 'Model:', 'Feature:', 'Segment:', 'Frequency:', 'Aggregation Window:'];

export const AlertsDrawerHeader = ({
  alerts,
  setAlerts,
  alertRule,
  alertIndex,
  changeAlertIndex,
  onClose,
  monitor,
  modelVersionId,
  alert,
  singleCheckRunOptions,
  currentModel,
  resolved
}: AlertsDrawerHeaderProps) => {
  const theme = useTheme();
  const location = useLocation();

  const alertFilters = useMemo(() => getAlertFilters(), [location.search]);

  const {
    mutateAsync: resolve,
    isError: resolveAlertError,
    isLoading: resolveAlertIsLoading
  } = useResolveAlertApiV1AlertsAlertIdResolvePost();
  const {
    mutateAsync: reactivate,
    isError: reactivateAlertError,
    isLoading: reactivateAlertIsLoading
  } = useReactivateAlertApiV1AlertsAlertIdReactivatePost();
  const { refetch: refetchAlertRule } = useGetAlertRulesApiV1AlertRulesGet(
    alertFilters as GetAlertRulesApiV1AlertRulesGetParams
  );

  const [isNotification, setIsNotification] = useState(false);
  const [infoTitles, setInfoTitles] = useState(DEFAULT_INFO_TITLES);

  const handleAlert = async () => {
    const alertId = alert.id;
    resolved ? await reactivate({ alertId }) : await resolve({ alertId });

    await refetchAlertRule();
    changeAlertIndex(prevIndex => (prevIndex === 0 ? 0 : prevIndex - 1));
    setAlerts(prevAlerts => [...prevAlerts].filter(a => a.id !== alertId));
    setIsNotification(true);
  };

  const alertColorsMap = useMemo(
    () => ({
      low: theme.palette.severity.low,
      medium: theme.palette.severity.medium,
      high: theme.palette.severity.high,
      critical: theme.palette.severity.critical
    }),
    [theme.palette]
  );

  const { alert_severity, condition } = alertRule;
  const color = alertColorsMap[alert_severity || 'low'];

  useEffect(() => {
    const valuesArr = [];
    const failedValues = alert?.failed_values;

    if (alert?.failed_values) {
      for (const failedValue in failedValues) {
        valuesArr.push(...Object.keys(alert.failed_values[failedValue]));
      }

      const infoTitle = [...new Set(valuesArr)].join(', ');

      setInfoTitles([infoTitle, ...DEFAULT_INFO_TITLES]);
    }
  }, [alert?.failed_values, setInfoTitles]);

  const info: string[] = useMemo(
    () => [
      `${OperatorsEnumMap[condition.operator]} ${condition.value}`,
      monitor?.check?.name || '',
      currentModel?.name || '',
      monitor?.additional_kwargs?.res_conf ? monitor?.additional_kwargs?.res_conf[0] : 'N/A',
      monitor?.data_filters ? `${monitor?.data_filters.filters[0].column}` : 'N/A',
      monitor?.frequency ? processFrequency(dayjs.duration(FrequencyMap[monitor.frequency], 'seconds')) : 'N/A',
      monitor?.aggregation_window ?? 'N/A'
    ],
    [
      condition.operator,
      condition.value,
      currentModel?.name,
      monitor?.additional_kwargs?.res_conf,
      monitor?.check?.name,
      monitor?.data_filters,
      monitor?.frequency,
      monitor?.aggregation_window
    ]
  );

  const monitorName = monitor?.name || 'N/A';
  const isError = resolveAlertError || reactivateAlertError;
  const isLoading = resolveAlertIsLoading || reactivateAlertIsLoading;
  const iconOpacity = isLoading ? 0.3 : 1;

  return (
    <>
      <StyledTopSection>
        {monitorName.length > MAX_CHARACTERS ? (
          <FullLengthTooltip title={monitorName}>
            <StyledAlertName flex={1}>{monitorName.slice(0, MAX_CHARACTERS) + '...'}</StyledAlertName>
          </FullLengthTooltip>
        ) : (
          <StyledAlertName flex={1}>{monitorName}</StyledAlertName>
        )}
        <DiagramAlertCountWidget alerts={alerts} alertIndex={alertIndex} changeAlertIndex={changeAlertIndex} flex={1} />
        <Stack direction="row" spacing="10px">
          <Tooltip title="Share" placement="top">
            <Box>
              <ShareButton onlyIcon />
            </Box>
          </Tooltip>
          <Tooltip title={resolved ? 'Reactivate' : 'Resolve'} placement="top">
            <Box>
              <StyledButtonResolve variant="text" disabled={isLoading} onClick={handleAlert}>
                {resolved ? <SyncIcon opacity={iconOpacity} color="primary" /> : <Check opacity={iconOpacity} />}
              </StyledButtonResolve>
            </Box>
          </Tooltip>
          <RunDownloadSuite
            modelVersionId={modelVersionId}
            notebookType="monitor"
            notebookId={monitor?.id}
            notebookName={monitor?.name}
            singleCheckRunOptions={singleCheckRunOptions}
          />
          <StyledIconButton onClick={onClose}>
            <CloseIcon />
          </StyledIconButton>
        </Stack>
      </StyledTopSection>
      <StyledBottomSection>
        <StyledFlexWrapper>
          <AlertsBadge severity={alert_severity} color={color} />
          {infoTitles.map((title, index) => (
            <StyledInfoTitlesContainer key={title}>
              {index === 0 && title.length > LABEL_VALUE_TITLE_MAX_CHARACTERS ? (
                <FullLengthTooltip title={title}>
                  <Typography variant="subtitle2">
                    {title.slice(0, LABEL_VALUE_TITLE_MAX_CHARACTERS) + '...'}
                  </Typography>
                </FullLengthTooltip>
              ) : (
                <Typography variant="subtitle2">{title}</Typography>
              )}
              <StyledInfoTitle variant="subtitle2">{info[index]}</StyledInfoTitle>
              {infoTitles.length - 1 !== index && <StyledDivider orientation="vertical" flexItem />}
            </StyledInfoTitlesContainer>
          ))}
        </StyledFlexWrapper>
      </StyledBottomSection>
      <AlertsSnackbar
        anchorOrigin={SNACKBAR_POSITION}
        open={isNotification}
        autoHideDuration={6000}
        onClose={() => setIsNotification(false)}
        severity={isError ? 'error' : 'success'}
      >
        <Box>{isError ? 'Something went wrong' : 'Success'}</Box>
      </AlertsSnackbar>
    </>
  );
};

const StyledTopSection = styled(Stack)({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  marginBottom: '6px',
  paddingBottom: '10px',
  borderBottom: `0.5px solid ${theme.palette.grey[200]}`
});

const StyledAlertName = styled(Typography)({
  fontWeight: 700,
  fontSize: '24px',
  lineHeight: '33.6px',
  letterSpacing: '0.1px'
});

const StyledFlexWrapper = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginBottom: '5px'
});

const StyledIconButton = styled(IconButton)({
  background: 'transparent',
  width: 36
});

const StyledBottomSection = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between'
});

const StyledButtonResolve = styled(Button)({
  minWidth: 36,
  minHeight: 36,
  padding: 0,
  borderRadius: '4px'
});

const StyledInfoTitlesContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  padding: '8px 0'
});

const StyledInfoTitle = styled(Typography)({
  fontWeight: 700,
  marginLeft: '4px',

  '&:last-child': { marginRight: '5px' }
});

const StyledDivider = styled(Divider)({
  margin: '0 10px',
  height: '10px',
  alignSelf: 'center',
  borderColor: 'text.disabled'
});
