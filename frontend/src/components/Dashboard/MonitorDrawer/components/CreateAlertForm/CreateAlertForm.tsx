import React, { useEffect, useState, useMemo, useCallback } from 'react';

import {
  AlertSeverity,
  MonitorSchema,
  OperatorsEnum,
  useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost,
  MonitorOptions
} from 'api/generated';

import useModels from 'helpers/hooks/useModels';

import { Box, Divider, MenuItem, Stack, Typography } from '@mui/material';

import { MarkedSelect } from 'components/base/MarkedSelect';
import { SelectCondition } from './SelectCondition';

import { checkInfoInitValue, monitorInfo } from './CreateAlertForm.helpers';

import { theme } from 'components/lib/theme';
import { StyledButton } from 'components/lib';

interface EditMonitorProps {
  monitor: MonitorSchema;
  onClose: () => void | undefined;
  runCheckLookBack: (checkId: number, data: MonitorOptions) => Promise<void>;
  setMonitorToRefreshId: React.Dispatch<React.SetStateAction<number | null>>;
}

export function CreateAlertForm({ monitor, onClose, runCheckLookBack, setMonitorToRefreshId }: EditMonitorProps) {
  const { getCurrentModel } = useModels();
  const { mutateAsync: createAlert } = useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost();

  const [numericValue, setNumericValue] = useState((monitor.data_filters?.filters[0].value as string) || 0);
  const [operator, setOperator] = useState<OperatorsEnum | ''>('');
  const [severity, setSeverity] = useState<AlertSeverity | ''>('');

  const currentModel = useMemo(
    () => getCurrentModel(monitor?.check.model_id || -1),
    [monitor?.check.model_id, getCurrentModel]
  );

  const updateGraph = useCallback(() => {
    if (!monitor) return;

    const endTime = currentModel?.latest_time
      ? new Date((currentModel?.latest_time as number) * 1000).toISOString()
      : new Date().toISOString();

    const data: MonitorOptions = {
      start_time: new Date(new Date(endTime).getTime() - monitor.lookback * 1000).toISOString(),
      end_time: endTime,
      additional_kwargs: monitor.additional_kwargs || checkInfoInitValue,
      frequency: monitor.frequency,
      aggregation_window: monitor.aggregation_window,
      filter: monitor.data_filters || undefined
    };

    runCheckLookBack(+monitor.check.id, data);
  }, [currentModel, monitor, runCheckLookBack]);

  const handleCreateAlert = async () => {
    onClose();

    if (severity !== '' && operator !== '') {
      const data = {
        monitorId: monitor.id,
        data: {
          alert_severity: severity,
          is_active: true,
          condition: {
            operator,
            value: +numericValue
          }
        }
      };

      await createAlert(data);
      setMonitorToRefreshId(monitor.id);
    }
  };

  useEffect(() => {
    updateGraph();
  }, [monitor, updateGraph]);

  return (
    <Stack justifyContent="space-between" width={{ xs: '200px', xl: '360px' }}>
      <Box sx={{ height: 'calc(100% - 100px)', overflowY: 'auto' }}>
        <Stack spacing="15px">
          {monitorInfo(monitor, currentModel.name).map(({ label, value }) => (
            <Typography variant="subtitle2" key={label} sx={{ color: theme.palette.text.primary }}>
              {label}: {value}
            </Typography>
          ))}
        </Stack>
        <Divider sx={{ m: '40px 0 11px', border: theme => `1px dashed ${theme.palette.text.primary}` }} />
        <Typography variant="subtitle1" sx={{ color: theme => theme.palette.text.primary }}>
          Alert severity
        </Typography>
        <Box mt="25px">
          <MarkedSelect
            label="Severity"
            size="small"
            clearValue={() => {
              setSeverity('');
            }}
            onChange={event => setSeverity(event.target.value as AlertSeverity)}
            disabled={!Object.keys(AlertSeverity).length}
            value={severity}
            fullWidth
          >
            {Object.keys(AlertSeverity).map(key => (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            ))}
          </MarkedSelect>
        </Box>
        <Divider sx={{ m: '25px 0 11px', border: theme => `1px dashed ${theme.palette.text.primary}` }} />
        <Typography variant="subtitle1" sx={{ color: theme => theme.palette.text.primary }}>
          Raise alert when check value is:
        </Typography>
        <Box width={1} marginTop="25px">
          <SelectCondition
            operator={operator}
            setOperator={setOperator}
            value={numericValue}
            setValue={setNumericValue}
          />
        </Box>
      </Box>
      <StyledButton
        label="Save & Activate"
        onClick={handleCreateAlert}
        disabled={!operator || !severity}
        sx={{ margin: 'auto auto 20px auto', width: '200px' }}
      />
    </Stack>
  );
}
