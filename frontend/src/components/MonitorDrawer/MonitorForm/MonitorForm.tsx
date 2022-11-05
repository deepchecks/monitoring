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
  useGetModelColumnsApiV1ModelsModelIdColumnsGet
} from 'api/generated';

import useGlobalState from 'context';
import useModels from 'hooks/useModels';
import useMonitorsData from '../../../hooks/useMonitorsData';
import useRunMonitorLookback from 'hooks/useRunMonitorLookback';

import { Box, MenuItem, SelectChangeEvent, TextField } from '@mui/material';

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

import { ColumnsSchema, ColumnStatsCategorical, ColumnStatsNumeric, ColumnType } from '../../../helpers/types/model';
import { timeWindow, checkInfoInitValue, formikInitValues, monitorSchemaData } from './MonitorForm.helpers';

import { LookbackCheckProps } from '../MonitorDrawer.types';
import { MonitorFormProps } from './MonitorForm.types';
import { WindowTimeout } from 'helpers/types/index';

function MonitorForm({ monitor, onClose, resetMonitor, runCheckLookback, setResetMonitor }: MonitorFormProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);
  const [selectedModelId, setSelectedModelId] = useState(Number);
  const [selectedCheckId, setSelectedCheckId] = useState(Number);

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

  const { values, handleChange, handleBlur, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: formikInitValues(monitor),
    onSubmit: async values => {
      let operator;
      let value;

      const column = columns[values.column];

      if (column) {
        if (column.type === ColumnType.numeric) {
          operator = OperatorsEnum.greater_than;
          value = values.numericValue;
        }

        if (column.type === ColumnType.categorical) {
          operator = OperatorsEnum.contains;
          value = values.category;
        }
      }

      if (monitor) {
        const monitorSchema = {
          monitorId: monitor.id,
          data: monitorSchemaData(values, monitor, globalState, operator, value)
        };

        await updateMonitor(monitorSchema);
      } else {
        const monitorSchema: MonitorCreationSchema = monitorSchemaData(values, monitor, globalState, operator, value);

        await createMonitor({ checkId: parseInt(values.check), data: monitorSchema });
      }

      refreshMonitors(monitor);
      formik.resetForm();
      onClose();
    }
  });

  const updateGraph = useCallback(
    (operator?: OperatorsEnum | undefined, value: string | number = '') => {
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

        if (operator) {
          lookbackCheckData.data.filter = {
            filters: [{ column: values.column, operator, value }]
          };
        }

        runCheckLookback(lookbackCheckData);
      }
    },
    [
      modelId,
      monitorModelsMap,
      monitor,
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
      if (!Array.isArray(newValue)) {
        setFieldValue('numericValue', newValue);
      }
    },
    [setFieldValue]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFieldValue('numericValue', event.target.value ? +event.target.value : '');
    },
    [setFieldValue]
  );

  const handleInputBlur = useCallback(() => {
    const column = columns[values.column];
    const stats = column.stats as ColumnStatsNumeric;

    if (+values.numericValue < stats.min) {
      setFieldValue('numericValue', stats.min);
    } else if (+values.numericValue > stats.max) {
      setFieldValue('numericValue', stats.max);
    }
  }, [columns, setFieldValue, values.column, values.numericValue]);

  const handleModelChange = (event: SelectChangeEvent<unknown>) => {
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
  };

  useMemo(() => {
    if (!values.column) {
      return setColumnComponent(null);
    } else {
      const column = columns[values.column];

      if (!column) return;

      if (column.type === ColumnType.categorical) {
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

      if (column.type === ColumnType.numeric) {
        const stats = column.stats as ColumnStatsNumeric;
        setColumnComponent(
          <Box mt="39px">
            <StyledTypographyLabel>Select Value</StyledTypographyLabel>
            <RangePicker
              onChange={handleSliderChange}
              handleInputBlur={handleInputBlur}
              handleInputChange={handleInputChange}
              name="numericValue"
              value={+values.numericValue || 0}
              min={stats.min}
              max={stats.max}
              valueLabelDisplay="auto"
            />
          </Box>
        );
        return;
      }
    }
  }, [values.column, values.category, values.numericValue]);

  useEffect(() => {
    const column = columns[values.column];

    if (column?.type === ColumnType.categorical) {
      setFieldValue('category', column?.stats?.values?.[0] || '');
    }
  }, [values.column, columns, setFieldValue]);

  const valuesCheck = !monitor && values.check;

  useEffect(() => {
    clearTimeout(timer.current);
    const column = columns[values.column];

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
      if (column.type === ColumnType.numeric) {
        if (checks && values.column && values.numericValue) {
          timer.current = setTimeout(() => {
            updateGraph('greater_than', values.numericValue);
          }, 500);
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
    valuesCheck,
    columns,
    monitor,
    setFieldValue,
    updateGraph,
    values.check,
    values.column,
    values.category,
    values.numericValue,
    values.lookback,
    values.aggregation_window,
    values.frequency,
    values.additional_kwargs
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
        <Box>
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
                    initialCheckInfoValues={values.additional_kwargs || monitor.additional_kwargs}
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
    </form>
  );
}

export default memo(MonitorForm);
