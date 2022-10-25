import { Box, Button, Divider, MenuItem, Stack, Typography } from '@mui/material';
import {
  AlertSeverity,
  MonitorSchema,
  OperatorsEnum,
  useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost
} from 'api/generated';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import processFrequency from 'helpers/utils/processFrequency';
import useModels from 'hooks/useModels';
import useRunMonitorLookback from 'hooks/useRunMonitorLookback';
import React, { memo, ReactNode, useEffect, useMemo, useState } from 'react';
import { MarkedSelect } from '../../MarkedSelect';
import { RangePicker } from '../../RangePicker';
import { LookbackCheckProps } from '../MonitorDrawer.types';

interface EditMonitorProps {
  monitor: MonitorSchema;
  onClose: () => void | undefined;
  runCheckLookback: (props: LookbackCheckProps) => void;
}

const minMax = 100;

function CreateAlert({ monitor, onClose, runCheckLookback }: EditMonitorProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);
  const { modelsMap } = useModels();
  const { mutate: createAlert } = useCreateAlertRuleApiV1MonitorsMonitorIdAlertRulesPost();

  const modelId = useMemo(() => monitor?.check.model_id ?? null, [monitor]);

  useRunMonitorLookback(+monitor.id, modelId?.toString() ?? null);

  const modelName = useMemo(() => {
    if (!modelId) return;
    return modelsMap[modelId].name;
  }, [modelId]);

  const formikInitValues: { numericValue: number; operator: '' | OperatorsEnum; severity: '' | AlertSeverity } = {
    numericValue: (monitor.data_filters?.filters[0].value as number) || 0,
    operator: '',
    severity: ''
  };

  const { values, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: formikInitValues,
    onSubmit: async values => {
      if (values.severity !== '' && values.operator !== '') {
        createAlert({
          monitorId: monitor.id,
          data: {
            alert_severity: values.severity,
            is_active: true,
            condition: {
              operator: values.operator,
              value: values.numericValue
            }
          }
        });
      }

      formik.resetForm();
      onClose();
    }
  });

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (!Array.isArray(newValue)) {
      setFieldValue('numericValue', newValue);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldValue('numericValue', event.target.value ? +event.target.value : '');
  };

  const checkInfoInitValue = () => ({
    check_conf: {}
  });

  const updateGraph = (operator?: OperatorsEnum | undefined, value: string | number = '') => {
    if (!monitor) return;

    const checkId = +monitor.check.id;

    const end_time = modelsMap[modelId]?.latest_time
      ? new Date((modelsMap[modelId]?.latest_time as number) * 1000).toISOString()
      : new Date().toISOString();

    const lookbackCheckData: LookbackCheckProps = {
      checkId,
      data: {
        start_time: new Date(new Date(end_time).getTime() - monitor.lookback * 1000).toISOString(),
        end_time,
        additional_kwargs: monitor.additional_kwargs || checkInfoInitValue(),
        frequency: monitor.frequency,
        aggregation_window: monitor.aggregation_window
      }
    };

    if (operator) {
      lookbackCheckData.data.filter = {
        filters: [{ column: (monitor.data_filters?.filters[0].column as string) || '', operator, value }]
      };
    }

    runCheckLookback(lookbackCheckData);
  };

  const handleInputBlur = () => {
    if (+values.numericValue < -minMax) {
      setFieldValue('numericValue', -minMax);
    } else if (+values.numericValue > minMax) {
      setFieldValue('numericValue', minMax);
    }
  };

  useMemo(() => {
    if (!values.operator) {
      return setColumnComponent(null);
    }

    setColumnComponent(
      <Box mt="39px">
        <Typography
          sx={{
            fontSize: 12,
            lineHeight: 1.57,
            letterSpacing: '0.1px',
            marginBottom: '10px',
            color: theme => theme.palette.text.disabled
          }}
        >
          Select Value
        </Typography>
        <RangePicker
          onChange={handleSliderChange}
          handleInputBlur={handleInputBlur}
          handleInputChange={handleInputChange}
          name="numericValue"
          value={+values.numericValue}
          min={-minMax}
          max={minMax}
          valueLabelDisplay="auto"
        />
      </Box>
    );
  }, [values.operator, values.numericValue]);

  const monitorInfo = useMemo(
    () => [
      { label: 'Monitor name', value: monitor?.name },
      { label: 'Model name', value: modelName },
      { label: 'Check name', value: monitor?.check?.name },
      { label: 'Feature name', value: monitor?.data_filters ? `${monitor?.data_filters.filters[0].column}` : 'N/A' },
      {
        label: 'Frequency',
        value: monitor?.frequency ? processFrequency(dayjs.duration(monitor?.frequency, 'seconds')) : 'N/A'
      },
      { label: 'Display range', value: dayjs.duration(monitor.lookback, 'seconds').humanize() }
    ],
    [monitor, modelName]
  );

  useEffect(() => {
    updateGraph();
  }, [monitor]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <Box
        sx={{
          padding: '40px 40px 47px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 1
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ textAlign: 'center' }}>
            New alert from monitor
          </Typography>
          <Stack mt="20px" spacing="15px">
            {monitorInfo.map(({ label, value }) => (
              <Typography variant="subtitle2" key={label} sx={{ color: theme => theme.palette.text.disabled }}>
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
                setFieldValue('severity', '');
              }}
              disabled={!Object.keys(AlertSeverity).length}
              {...getFieldProps('severity')}
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
          <Box width={1} mt="25px">
            <MarkedSelect
              label="Operator"
              size="small"
              clearValue={() => {
                setFieldValue('operator', '');
              }}
              disabled={!Object.keys(OperatorsEnum).length}
              {...getFieldProps('operator')}
              fullWidth
            >
              {Object.keys(OperatorsEnum).map(key => (
                <MenuItem key={key} value={key}>
                  {key}
                </MenuItem>
              ))}
            </MarkedSelect>
            {ColumnComponent}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Button type="submit" size="large" disabled={!values.operator || !values.severity} sx={{ width: 1 }}>
            Save & Activate
          </Button>
        </Box>
      </Box>
    </form>
  );
}

export default memo(CreateAlert);
