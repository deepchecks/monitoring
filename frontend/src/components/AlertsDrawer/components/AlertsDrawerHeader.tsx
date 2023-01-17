import React, { Dispatch, SetStateAction, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import {
  AlertRuleInfoSchema,
  AlertSchema,
  ModelManagmentSchema,
  MonitorSchema,
  SingleCheckRunOptions
} from 'api/generated';

import { Box, Button, Divider, IconButton, Stack, styled, Typography, useTheme, Tooltip } from '@mui/material';

import { RunDownloadSuite } from 'components/RunDownloadSuite';
import { ShareButton } from 'components/ShareButton';
import { AlertsBadge } from './AlertBadge';
import { DiagramAlertCountWidget } from 'components/DiagramAlertCountWidget';
import { FullLengthTooltip } from 'components/DiagramTutorialTooltip';

import { OperatorsEnumMap } from 'helpers/conditionOperator';
import processFrequency from 'helpers/utils/processFrequency';

import { CloseIcon, Check } from 'assets/icon/icon';
import { colors } from 'theme/colors';

dayjs.extend(localizedFormat);

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

const MAX_CHARACTERS = 27;
const LABEL_VALUE_TITLE_MAX_CHARACTERS = 25;

const DEFAULT_INFO_TITLES = ['Check:', 'Model:', 'Feature:', 'Segment:', 'Frequency:'];
let INFO_TITLES = DEFAULT_INFO_TITLES;

export const AlertsDrawerHeader = ({
  alerts,
  alertRule,
  alertIndex,
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

  const alertColorsMap = useMemo(
    () => ({
      low: theme.palette.error.contrastText,
      mid: theme.palette.error.light,
      high: theme.palette.error.dark,
      critical: theme.palette.error.main
    }),
    [theme.palette]
  );

  const { alert_severity, condition } = alertRule;
  const color = alertColorsMap[alert_severity || 'low'];

  useEffect(() => {
    const valuesArr = [];
    const failedValues = alerts[alertIndex]?.failed_values;

    for (const failedValue in failedValues) {
      valuesArr.push(...Object.keys(alerts[alertIndex].failed_values[failedValue]));
    }

    const infoTitle = [...new Set(valuesArr)].join(', ');

    INFO_TITLES = [infoTitle, ...DEFAULT_INFO_TITLES];
  }, [alertIndex, alerts, condition.operator, condition.value]);

  const info: string[] = useMemo(
    () => [
      `${OperatorsEnumMap[condition.operator]} ${condition.value}`,
      monitor?.check?.name || '',
      currentModel?.name || '',
      monitor?.additional_kwargs?.res_conf ? monitor?.additional_kwargs?.res_conf[0] : 'N/A',
      monitor?.data_filters ? `${monitor?.data_filters.filters[0].column}` : 'N/A',
      monitor?.frequency ? processFrequency(dayjs.duration(monitor?.frequency, 'seconds')) : 'N/A'
    ],
    [
      condition.operator,
      condition.value,
      currentModel?.name,
      monitor?.additional_kwargs?.res_conf,
      monitor?.check?.name,
      monitor?.data_filters,
      monitor?.frequency
    ]
  );

  const monitorName = monitor?.name || 'N/A';

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
          <Tooltip title="Resolve" placement="top">
            <StyledButtonResolve variant="text" disabled={alert?.resolved} onClick={onResolve}>
              <Check opacity={alert?.resolved ? 0.3 : 1} />
            </StyledButtonResolve>
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
          {INFO_TITLES.map((title, index) => (
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
              {INFO_TITLES.length - 1 !== index && <StyledDivider orientation="vertical" flexItem />}
            </StyledInfoTitlesContainer>
          ))}
        </StyledFlexWrapper>
      </StyledBottomSection>
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
  borderBottom: `0.5px solid ${colors.neutral.grey[200]}`
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
