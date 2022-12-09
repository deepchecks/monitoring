import React, { ReactNode, useEffect, useCallback, useMemo, memo, useRef, useState } from 'react';
import { useFormik } from 'formik';
import mixpanel from 'mixpanel-browser';

import {
  MonitorCreationSchema,
  OperatorsEnum,
  useUpdateMonitorApiV1MonitorsMonitorIdPut,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useGetCheckInfoApiV1ChecksCheckIdInfoGet,
  useGetChecksApiV1ModelsModelIdChecksGet,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet,
  getAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet
} from 'api/generated';

import useGlobalState from 'context';
import useModels from 'hooks/useModels';
import useMonitorsData from 'hooks/useMonitorsData';
import useRunMonitorLookback from 'hooks/useRunMonitorLookback';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  SelectChangeEvent,
  TextField,
  Typography
} from '@mui/material';

import { CheckInfo } from '../CheckInfo';
import { Subcategory } from '../Subcategory';
import { MarkedSelect } from 'components/MarkedSelect';
import { RangePicker } from 'components/RangePicker';
import { TooltipInputWrapper } from 'components/TooltipInputWrapper';

import {
  StyledButton,
  StyledButtonWrapper,
  StyledStackContainer,
  StyledStackInputs,
  StyledTypography,
  StyledTypographyLabel
} from './MonitorForm.style';

import { ColumnsSchema, ColumnStatsCategorical, ColumnStatsNumeric, ColumnType } from 'helpers/types/model';
import { timeWindow, checkInfoInitValue, formikInitValues, monitorSchemaData } from './MonitorForm.helpers';

import { LookbackCheckProps } from '../MonitorDrawer.types';
import { MonitorFormProps } from './MonitorForm.types';
import { WindowTimeout } from 'helpers/types/index';

function MonitorForm({ monitor, onClose, resetMonitor, runCheckLookback, setResetMonitor }: MonitorFormProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);
  const [selectedModelId, setSelectedModelId] = useState(Number);
  const [selectedCheckId, setSelectedCheckId] = useState(Number);
  const [activeAlertsModalOpen, setActiveAlertsModalOpen] = useState(false);

  const timer = useRef<WindowTimeout>();

  const globalState = useGlobalState();
  const { modelsMap: monitorModelsMap, models: modelsList } = useModels();
  const { refreshMonitors } = useMonitorsData();

  const modelId = useMemo(() => monitor?.check.model_id ?? null, [monitor]);
  const modelName = useMemo(() => {
    if (!modelId) return;
    return monitorModelsMap[modelId].name;
  }, [modelId, monitorModelsMap]);

  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(monitor ? monitor.check.id : selectedCheckId);
  const { data: columns = {} as ColumnsSchema, isLoading: isColumnsLoading } =
    useGetModelColumnsApiV1ModelsModelIdColumnsGet(monitor && modelId ? modelId : selectedModelId);
  const { data: checks = [] } = useGetChecksApiV1ModelsModelIdChecksGet(selectedModelId);

  const { mutateAsync: createMonitor } = useCreateMonitorApiV1ChecksCheckIdMonitorsPost();
  const { mutateAsync: updateMonitor } = useUpdateMonitorApiV1MonitorsMonitorIdPut();

  useRunMonitorLookback(monitor?.id || null, modelId?.toString() ?? null);

  const initValues = useMemo(() => formikInitValues(monitor), [monitor]);

  const { values, handleChange, handleBlur, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: initValues,
    onSubmit: async () => {
      if (monitor) {
        // Check if this monitor has active alerts
        let hasActiveAlerts = false;
        for (const alertRule of monitor.alert_rules) {
          const alerts = await getAlertsOfAlertRuleApiV1AlertRulesAlertRuleIdAlertsGet(alertRule.id);
          const nonResolved = alerts.filter(a => a.resolved === false);
          if (nonResolved && nonResolved.length > 0) {
            hasActiveAlerts = true;
            setActiveAlertsModalOpen(true);
            break;
          }
        }
        if (hasActiveAlerts) {
          return;
        }
      }

      await saveMonitor();
    }
  });

  const column = useMemo(() => columns[values.column], [columns, values.column]);

  const saveMonitor = useCallback(async () => {
    let operator;
    let value;
    const filter = [];

    if (monitor) {
      if (column) {
        if (column.type === ColumnType.numeric || column.type === ColumnType.integer) {
          filter.push({ column: values.column, operator: OperatorsEnum.greater_than, value: values.numericValue[0] });
          filter.push({ column: values.column, operator: OperatorsEnum.less_than, value: values.numericValue[1] });
        }

        if (column.type === ColumnType.categorical) {
          operator = OperatorsEnum.contains;
          value = values.category;
        }
      }

      const monitorSchema = {
        monitorId: monitor.id,
        data: monitorSchemaData(values, monitor, globalState, operator, value, filter)
      };

      await updateMonitor(monitorSchema);
    } else {
      const monitorSchema: MonitorCreationSchema = monitorSchemaData(values, monitor, globalState, operator, value);

      if (typeof values.check === 'number') {
        await createMonitor({ checkId: values.check, data: monitorSchema });
      }
    }

    refreshMonitors(monitor);
    formik.resetForm();
    onClose();
  }, [column, createMonitor, formik, globalState, monitor, onClose, refreshMonitors, updateMonitor, values]);

  const handleActiveAlertResolve = async () => {
    if (monitor) {
      await saveMonitor();
    }

    setActiveAlertsModalOpen(false);
  };

  const updateGraph = useCallback(
    async (operator?: OperatorsEnum | null, value: string | number[] = '') => {
      const checkId = monitor ? +monitor.check.id : +values.check;
      const map = monitor ? (modelId ? monitorModelsMap[modelId] : false) : monitorModelsMap[selectedModelId];

      if (map) {
        const end_time = map.latest_time ? new Date((map.latest_time as number) * 1000) : new Date();

        const lookbackCheckData: LookbackCheckProps = {
          checkId,
          data: {
            start_time: new Date(end_time.getTime() - +values.lookback * 1000).toISOString(),
            end_time: end_time.toISOString(),
            additional_kwargs: values.additional_kwargs || monitor?.additional_kwargs,
            frequency: +values.frequency,
            aggregation_window: +values.aggregation_window
          }
        };

        if (operator && typeof value === 'string') {
          lookbackCheckData.data.filter = {
            filters: [{ column: values.column, operator, value }]
          };
        }
        if (!operator && value.length) {
          lookbackCheckData.data.filter = {
            filters: [
              { column: values.column, operator: OperatorsEnum.greater_than, value: value[0] },
              { column: values.column, operator: OperatorsEnum.less_than, value: value[1] }
            ]
          };
        }

        await runCheckLookback(lookbackCheckData);
      }
    },
    [
      modelId,
      monitor,
      monitorModelsMap,
      runCheckLookback,
      selectedModelId,
      values.additional_kwargs,
      values.aggregation_window,
      values.check,
      values.column,
      values.frequency,
      values.lookback
    ]
  );

  useEffect(() => {
    if (!values.check) return;
    setSelectedCheckId(+values.check);
  }, [values.check]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    formik.handleSubmit(e);

    mixpanel.track('Saved successfully', { 'The monitor details': values });
  };

  const handleSliderChange = useCallback(
    (event: Event, newValue: number | number[]) => {
      setFieldValue('numericValue', newValue);
    },
    [setFieldValue]
  );

  const handleNumericInputChange = useCallback(
    (values: number[]) => {
      setFieldValue('numericValue', values);
    },
    [setFieldValue]
  );

  const handleModelChange = useCallback(
    (event: SelectChangeEvent<unknown>) => {
      const value = event.target.value as string;
      handleChange(event);
      setSelectedModelId(+value);

      setFieldValue('model', value);
      setFieldValue('check', '');
      setFieldValue('column', '');
      setFieldValue('category', '');
      setFieldValue('lookback', '');
      setFieldValue('numericValue', '');
      setFieldValue('additional_kwargs', checkInfoInitValue());
      updateGraph();
    },
    [handleChange, setFieldValue, updateGraph]
  );

  useMemo(() => {
    if (!values.column) {
      return setColumnComponent(null);
    } else {
      if (!column) return;

      if (column.type === ColumnType.categorical) {
        setFieldValue('numericValue', '');

        const stats = column.stats as ColumnStatsCategorical;

        setColumnComponent(
          <Subcategory>
            <MarkedSelect
              label="Select category"
              size="small"
              clearValue={() => {
                setFieldValue('category', '');
              }}
              disabled={!stats.values.length}
              fullWidth
              {...getFieldProps('category')}
            >
              {stats.values.map((col: string, index: number) => (
                <MenuItem key={index} value={col}>
                  {col}
                </MenuItem>
              ))}
            </MarkedSelect>
          </Subcategory>
        );
        return;
      }

      if (column.type === ColumnType.numeric || column.type === ColumnType.integer) {
        setFieldValue('category', '');

        const stats = column.stats as ColumnStatsNumeric;

        const min = +stats.min.toFixed(2) || 0;
        const max = +stats.max.toFixed(2) || 0;
        const value = (values.numericValue.length ? values.numericValue : [min, max]) as number[];

        setColumnComponent(
          <Box mt="39px">
            <StyledTypographyLabel>Select Value</StyledTypographyLabel>
            <RangePicker
              onChange={handleSliderChange}
              handleValueChange={handleNumericInputChange}
              name="numericValue"
              value={value}
              min={min}
              max={max}
              valueLabelDisplay="auto"
            />
          </Box>
        );
        return;
      }
    }
  }, [
    values.column,
    column,
    values.numericValue,
    getFieldProps,
    handleNumericInputChange,
    handleSliderChange,
    setFieldValue
  ]);

  useEffect(() => {
    if (column?.type === ColumnType.categorical) {
      const val = column?.stats?.values;
      const category = val?.find(c => c === values.category);
      setFieldValue('category', val?.length ? (category ? category : val[0]) : '');
    }
  }, [values.category, column, setFieldValue]);

  useEffect(() => {
    clearTimeout(timer.current);

    if (values.frequency && !values.aggregation_window) {
      setFieldValue('aggregation_window', values.frequency);
    }

    const checks = monitor
      ? values.lookback && values.aggregation_window && values.frequency
      : values.check && values.lookback && values.aggregation_window && values.frequency;

    if (!column && checks) {
      updateGraph();
    }

    if (column) {
      if (column.type === ColumnType.numeric || column.type === ColumnType.integer) {
        if (checks && values.column && values.numericValue) {
          timer.current = setTimeout(() => {
            updateGraph(null, values.numericValue);
          }, 700);
        }
      }

      if (column.type === ColumnType.categorical) {
        if (checks && values.column && values.category) {
          updateGraph('contains', values.category);
        }
      }
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [
    column,
    monitor,
    setFieldValue,
    updateGraph,
    values.aggregation_window,
    values.category,
    values.check,
    values.column,
    values.frequency,
    values.lookback,
    values.numericValue
  ]);

  useEffect(() => {
    if (resetMonitor) {
      setResetMonitor(false);
      formik.resetForm();
    }
  }, [resetMonitor, formik, setResetMonitor]);

  return (
    <form onSubmit={e => handleSubmit(e)}>
      <StyledStackContainer>
        <Box sx={{ pb: '20px' }}>
          <StyledTypography variant="h4">{`${monitor ? 'Edit' : 'New'} Monitor`}</StyledTypography>
          <StyledStackInputs spacing="50px">
            <TextField
              label="Monitor Name"
              variant="outlined"
              size="small"
              {...getFieldProps('name')}
              required={!monitor}
            />

            {monitor ? (
              <>
                <TextField variant="outlined" label={`Model: ${modelName}`} size="small" disabled={true} />
                <TextField variant="outlined" label={`Check: ${monitor?.check.name}`} size="small" disabled={true} />
              </>
            ) : (
              <>
                <MarkedSelect
                  label="Select Model"
                  onChange={handleModelChange}
                  name="model"
                  clearValue={() => {
                    setFieldValue('model', '');
                  }}
                  onBlur={handleBlur}
                  size="small"
                  value={values.model}
                  fullWidth
                  required
                >
                  {modelsList.map(({ name, id }, index) => (
                    <MenuItem key={index} value={id}>
                      {name}
                    </MenuItem>
                  ))}
                </MarkedSelect>

                <MarkedSelect
                  label="Select Check"
                  size="small"
                  clearValue={() => {
                    setFieldValue('check', '');
                  }}
                  disabled={!checks.length}
                  {...getFieldProps('check')}
                  fullWidth
                  required
                >
                  {checks.map(({ name, id }, index) => (
                    <MenuItem key={index} value={id}>
                      {name}
                    </MenuItem>
                  ))}
                </MarkedSelect>
              </>
            )}

            {monitor
              ? checkInfo && (
                  <CheckInfo
                    checkInfo={checkInfo}
                    initialCheckInfoValues={monitor?.additional_kwargs || checkInfoInitValue()}
                    setFieldValue={setFieldValue}
                  />
                )
              : values.check && checkInfo && <CheckInfo checkInfo={checkInfo} setFieldValue={setFieldValue} />}

            <TooltipInputWrapper title="The frequency of sampling the monitor data">
              <MarkedSelect
                label="Frequency"
                size="small"
                clearValue={() => {
                  setFieldValue('frequency', '');
                }}
                {...getFieldProps('frequency')}
                fullWidth
                required
              >
                {timeWindow.map(({ label, value }, index) => (
                  <MenuItem key={index} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </MarkedSelect>
            </TooltipInputWrapper>
            <TooltipInputWrapper title="The date range for calculating the monitor sample. e.g. sample every day and use the last 7 days to calculate the metric">
              <MarkedSelect
                label="Aggregation Window"
                size="small"
                clearValue={() => {
                  setFieldValue('aggregation_window', '');
                }}
                {...getFieldProps('aggregation_window')}
                fullWidth
                required
              >
                {timeWindow.map(({ label, value }, index) => (
                  <MenuItem key={index} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </MarkedSelect>
            </TooltipInputWrapper>
            <TooltipInputWrapper title="The range of viewing the monitor: e.g. from <date> to <date>">
              <MarkedSelect
                label="Time Range"
                size="small"
                clearValue={() => {
                  setFieldValue('lookback', '');
                }}
                {...getFieldProps('lookback')}
                fullWidth
                required={!monitor}
              >
                {timeWindow.map(({ label, value }, index) => (
                  <MenuItem key={index} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </MarkedSelect>
            </TooltipInputWrapper>

            <Box width={1}>
              <MarkedSelect
                label={monitor ? 'Filter by Column' : 'Segment'}
                size="small"
                clearValue={() => {
                  setFieldValue('column', '');
                  setFieldValue('category', '');
                  setFieldValue('numericValue', '');
                }}
                disabled={!Object.keys(columns).length}
                {...getFieldProps('column')}
                fullWidth
              >
                {Object.keys(columns).map(key => (
                  <MenuItem key={key} value={key}>
                    {key}
                  </MenuItem>
                ))}
              </MarkedSelect>
              {ColumnComponent}
            </Box>
          </StyledStackInputs>
        </Box>

        <StyledButtonWrapper>
          <StyledButton
            type="submit"
            size="large"
            disabled={
              !values.lookback ||
              !values.frequency ||
              !values.aggregation_window ||
              (monitor ? isColumnsLoading : !values.check)
            }
          >
            Save
          </StyledButton>
        </StyledButtonWrapper>
      </StyledStackContainer>

      <Dialog open={activeAlertsModalOpen}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent dividers>
          <Typography>
            This monitor has active alerts connected to it. In order to edit the monitor, all alerts must be resolved
            first. Are you sure you want to edit this monitor and resolve all alerts connected to it?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setActiveAlertsModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleActiveAlertResolve}>OK</Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}

export default memo(MonitorForm);
