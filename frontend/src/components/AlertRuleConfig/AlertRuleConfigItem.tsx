import React, { useState } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import { AlertRuleConfigSchema } from 'api/generated';

import { alpha, Button, Stack, Typography, useTheme } from '@mui/material';

import { AlertCount } from './AlertCount';

import { DeleteIcon, PencilDrawing } from 'assets/icon/icon';
import { OperatorsEnumMap } from 'helpers/conditionOperator';

interface AlertRuleConfigItemProps {
  alertRule: AlertRuleConfigSchema;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export const AlertRuleConfigItem = ({ alertRule, onEdit, onDelete }: AlertRuleConfigItemProps) => {
  dayjs.extend(duration);
  dayjs.extend(relativeTime);
  dayjs.extend(localizedFormat);

  const [isHovered, setIsHovered] = useState(false);

  const {
    alert_severity: severity,
    check_name: checkName,
    non_resolved_alerts: NonResolvedAlerts,
    total_alerts: totalAlerts,
    recent_alert: recentAlert,
    frequency: frequency,
    name
  } = alertRule;
  const theme = useTheme();

  const [headerColor, setHeaderColor] = useState(theme.palette.error.dark);

  const checkFrequencyFormatted = dayjs.duration(frequency, 'seconds').humanize();

  const { operator, value } = alertRule.condition;
  const condition = `${OperatorsEnumMap[operator]} ${value}`;

  return (
    <Stack
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        borderRadius: '10px',
        boxShadow: ' 0px 4px 13px 2px rgba(0, 0, 0, 0.12)',
        lineHeight: '34px',
        outline: '6px solid transparent',
        '&:hover': {
          transition: 'outline-color .4s',
          outlineColor: theme.palette.primary.contrastText
        }
      }}
    >
      <Stack direction="row" height="83px">
        {severity && <AlertCount severity={severity} setColor={setHeaderColor} />}
        <Stack
          sx={{
            p: '11px 13px',
            flexGrow: 1,
            backgroundColor: isHovered ? alpha(theme.palette.primary.contrastText, 0.4) : alpha(headerColor, 0.1),
            color: isHovered ? theme.palette.primary.main : theme.palette.text.primary,
            transition: 'color .4s',
            borderTopRightRadius: '0.6rem'
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '20px'
            }}
          >
            {name} Alert
          </Typography>
        </Stack>
      </Stack>
      <Stack
        sx={{
          m: '40px 23px',
          '>*': {
            mb: '16px',
            ':last-of-type': {
              mb: 0
            }
          }
        }}
      >
        <Stack direction="row">
          <Typography sx={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', mr: '10px' }}>Condition:</Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px' }}>
            {checkName} {condition}
          </Typography>
        </Stack>
        <Stack direction="row">
          <Typography sx={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', mr: '10px' }}>
            Check Frequency:
          </Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px' }}>
            Once {checkFrequencyFormatted}
          </Typography>
        </Stack>
        <Stack direction="row">
          <Typography sx={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', mr: '10px' }}>Alert #:</Typography>
          <Stack direction="row">
            <Typography sx={{ fontSize: '16px', fontWeight: 700, lineHeight: '24px', letterSpacing: '0.15px' }}>
              {NonResolvedAlerts || 0}
            </Typography>
            <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px', letterSpacing: '0.15px' }}>
              /{totalAlerts || 0}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction="row">
          <Typography sx={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px', mr: '10px' }}>
            Recent Alert:
          </Typography>
          <Typography sx={{ fontSize: '16px', fontWeight: 400, lineHeight: '24px' }}>
            {recentAlert ? dayjs(recentAlert).format('L') : '-'}
          </Typography>
        </Stack>
      </Stack>
      {isHovered && (
        <Stack
          alignItems="center"
          justifyContent="flex-end"
          direction="row"
          sx={{
            borderRadius: '10px',
            height: '100px',
            width: '100%',
            position: 'absolute',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) -12.12%, #FFFFFF 28.76%)'
          }}
        >
          <Button
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '10px'
            }}
            variant="text"
            onClick={onEdit}
          >
            <PencilDrawing />
            <Typography sx={{ fontSize: '10px', lineHeight: '12px', letterSpacing: '0.4px' }}>Edit rule</Typography>
          </Button>
          <Button
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '10px',
              marginRight: '0.3em'
            }}
            variant="text"
            onClick={() => onDelete()}
          >
            <DeleteIcon />
            <Typography sx={{ fontSize: '10px', lineHeight: '12px', letterSpacing: '0.4px' }}>Delete rule</Typography>
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
