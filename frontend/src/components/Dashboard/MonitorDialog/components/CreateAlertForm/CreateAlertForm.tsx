import React, { useEffect, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';

import {
  AlertSeverity,
  MonitorSchema,
  OperatorsEnum,
  useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost,
  MonitorOptions
} from 'api/generated';

import useModels from 'helpers/hooks/useModels';

import { MenuItem, Stack, StackProps } from '@mui/material';

import { SelectCondition } from './SelectCondition';
import { StyledText } from 'components/lib';
import { BaseDropdown } from 'components/base/InputDropdown/InputDropdown';

import { checkInfoInitValue } from './CreateAlertForm.helpers';
import { constants } from '../../monitorDialog.constants';

interface EditMonitorProps extends StackProps {
  monitor: MonitorSchema;
  onClose: () => void | undefined;
  runCheckLookBack: (checkId: number, data: MonitorOptions) => Promise<void>;
  setMonitorToRefreshId: React.Dispatch<React.SetStateAction<number | null>>;
  setSubmitButtonDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export const CreateAlertForm = forwardRef(
  (
    {
      monitor,
      onClose,
      runCheckLookBack,
      setMonitorToRefreshId,
      setSubmitButtonDisabled,
      ...otherProps
    }: EditMonitorProps,
    ref
  ) => {
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

      onClose();
    };

    useImperativeHandle(ref, () => ({
      submit() {
        handleCreateAlert();
      }
    }));

    useEffect(() => {
      updateGraph();
    }, [monitor, updateGraph]);

    useEffect(() => {
      setSubmitButtonDisabled(!operator || !severity);
    }, [operator, severity]);

    return (
      <Stack {...otherProps}>
        <StyledText
          text={currentModel.name}
          type="h2"
          sx={theme => ({ fontWeight: 500, color: theme.palette.grey[500], marginBottom: '26px' })}
        />
        <BaseDropdown
          label={constants.createAlertForm.severityLabel}
          clearValue={() => setSeverity('')}
          onChange={event => setSeverity(event.target.value as AlertSeverity)}
          disabled={!Object.keys(AlertSeverity).length}
          value={severity}
          required
          sx={{ marginBottom: '32px' }}
        >
          {Object.keys(AlertSeverity).map(key => (
            <MenuItem key={key} value={key}>
              {key}
            </MenuItem>
          ))}
        </BaseDropdown>
        <SelectCondition
          operator={operator}
          setOperator={setOperator}
          value={numericValue}
          setValue={setNumericValue}
        />
      </Stack>
    );
  }
);

CreateAlertForm.displayName = 'CreateAlertForm';
