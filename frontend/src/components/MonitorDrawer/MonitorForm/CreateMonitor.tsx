import { Box, MenuItem, SelectChangeEvent, TextField } from '@mui/material';
import {
  MonitorCreationSchema,
  OperatorsEnum,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  useGetCheckInfoApiV1ChecksCheckIdInfoGet,
  useGetChecksApiV1ModelsModelIdChecksGet,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet
} from 'api/generated';
import useGlobalState from 'Context';
import { useFormik } from 'formik';
import React, { Dispatch, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { ColumnsSchema, ColumnStatsCategorical, ColumnStatsNumeric, ColumnType } from '../../../helpers/types/model';
import { MarkedSelect } from '../../MarkedSelect';
import { RangePicker } from '../../RangePicker';
import { Subcategory } from '../Subcategory';
import {
  StyledButton,
  StyledButtonWrapper,
  StyledStackContainer,
  StyledStackInputs,
  StyledTypography,
  StyledTypographyLabel
} from './MonitorForm.style';

import useModelsMap from 'hooks/useModels';
import useMonitorsData from '../../../hooks/useMonitorsData';
import { CheckInfo } from '../CheckInfo';
import { LookbackCheckProps } from '../MonitorDrawer';

const timeWindow = [
  { label: '1 hour', value: 60 * 60 },
  { label: '1 day', value: 60 * 60 * 24 },
  { label: '1 week', value: 60 * 60 * 24 * 7 },
  { label: '1 month', value: 60 * 60 * 24 * 31 },
  { label: '3 months', value: 60 * 60 * 24 * 31 * 3 }
];

interface CreateMonitorProps {
  onClose: () => void | undefined;
  resetMonitor: boolean;
  runCheckLookback: (props: LookbackCheckProps) => void;
  setResetMonitor: Dispatch<SetStateAction<boolean>>;
}

export function CreateMonitor({ onClose, resetMonitor, runCheckLookback, setResetMonitor }: CreateMonitorProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);
  const [selectedModelId, setSelectedModelId] = useState(Number);
  const [selectedCheckId, setSelectedCheckId] = useState(Number);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { refreshMonitors } = useMonitorsData();
  const globalState = useGlobalState();
  const { modelsMap } = useModelsMap();

  const { data: columns = {} as ColumnsSchema } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(selectedModelId);
  const { data: checks = [] } = useGetChecksApiV1ModelsModelIdChecksGet(selectedModelId);
  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(selectedCheckId);

  const { mutateAsync: createMonitor } = useCreateMonitorApiV1ChecksCheckIdMonitorsPost();

  const checkInfoInitValue = () => ({
    check_conf: {}
  });

  const { values, handleChange, handleBlur, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: {
      name: '',
      category: '',
      check: '',
      column: '',
      model: '',
      numericValue: '',
      lookback: '',
      additional_kwargs: checkInfoInitValue(),
      frequency: '',
      aggregation_window: ''
    },
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

      const monitorSchema: MonitorCreationSchema = {
        name: values.name,
        lookback: +values.lookback,
        dashboard_id: globalState.dashboard_id,
        additional_kwargs: values.additional_kwargs,
        frequency: +values.frequency,
        aggregation_window: +values.aggregation_window
      };

      if (values.column && operator && value) {
        monitorSchema.data_filters = {
          filters: [
            {
              column: values.column,
              operator: operator || OperatorsEnum.contains,
              value: value || values.category
            }
          ]
        };
      } else {
        monitorSchema.data_filters = undefined;
      }

      console.log('Creating monitor', { checkId: parseInt(values.check), data: monitorSchema });

      await createMonitor({ checkId: parseInt(values.check), data: monitorSchema });
      refreshMonitors();
      formik.resetForm();
      onClose();
    }
  });

  const updateGraph = (operator?: OperatorsEnum | undefined, value: string | number = '') => {
    const checkId = +values.check;

    const end_time = modelsMap[selectedModelId]?.latest_time
      ? new Date((modelsMap[selectedModelId]?.latest_time as number) * 1000).toISOString()
      : new Date().toISOString();

    const lookbackCheckData: LookbackCheckProps = {
      checkId,
      data: {
        start_time: new Date(Date.now() - +values.lookback * 1000).toISOString(),
        end_time,
        additional_kwargs: values.additional_kwargs,
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
  };

  useEffect(() => {
    if (!values.check) return;
    setSelectedCheckId(+values.check);
  }, [values.check]);

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

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (!Array.isArray(newValue)) {
      setFieldValue('numericValue', newValue);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldValue('numericValue', event.target.value ? +event.target.value : '');
  };

  const handleInputBlur = () => {
    const column = columns[values.column];
    const stats = column.stats as ColumnStatsNumeric;
    if (+values.numericValue < stats.min) {
      setFieldValue('numericValue', stats.min);
    } else if (+values.numericValue > stats.max) {
      setFieldValue('numericValue', stats.max);
    }
  };

  useMemo(() => {
    if (!values.column) {
      return setColumnComponent(null);
    }
    if (values.column) {
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
  }, [values.column]);

  useEffect(() => {
    clearTimeout(timer.current);
    const column = columns[values.column];

    if (values.frequency && !values.aggregation_window) {
      setFieldValue('aggregation_window', values.frequency);
    }

    if (!column && values.check && values.lookback && values.aggregation_window && values.frequency) {
      updateGraph();
    }

    if (column) {
      if (column.type === ColumnType.numeric) {
        if (values.check && values.lookback && values.aggregation_window && values.frequency && values.column && values.numericValue) {
          timer.current = setTimeout(() => {
            updateGraph('greater_than', values.numericValue);
          }, 500);
        }
      }

      if (column.type === ColumnType.categorical) {
        if (values.check && values.lookback && values.aggregation_window && values.frequency && values.column && values.category) {
          updateGraph('contains', values.category);
        }
      }
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [values.check, values.column, values.category, values.numericValue, values.lookback, values.aggregation_window, values.frequency, values.additional_kwargs]);

  useEffect(() => {
    if (resetMonitor) {
      setResetMonitor(false);
      formik.resetForm();
    }
  }, [resetMonitor]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <StyledStackContainer>
        <Box>
          <StyledTypography variant="h4">New Monitor</StyledTypography>
          <StyledStackInputs spacing="50px">
            <TextField label="Monitor Name" variant="outlined" size="small" {...getFieldProps('name')} required />
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
              {Object.values(modelsMap).map(({ name, id }, index) => (
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
            {values.check && checkInfo && <CheckInfo checkInfo={checkInfo} setFieldValue={setFieldValue} />}
            <MarkedSelect label="Frequency" size="small" clearValue={() => {setFieldValue('frequency', '')}} {...getFieldProps('frequency')} fullWidth required>
              {timeWindow.map(({ label, value }, index) => (
                <MenuItem key={index} value={value}>
                  {label}
                </MenuItem>
              ))}
            </MarkedSelect>
            <MarkedSelect label="Aggregation Window" size="small" clearValue={() => {setFieldValue('aggregation_window', '')}} {...getFieldProps('aggregation_window')} fullWidth required>
              {timeWindow.map(({ label, value }, index) => (
                <MenuItem key={index} value={value}>
                  {label}
                </MenuItem>
              ))}
            </MarkedSelect>
            <MarkedSelect label="Lookback" size="small" clearValue={() => {setFieldValue('lookback', '')}} {...getFieldProps('lookback')} fullWidth required>
              {timeWindow.map(({ label, value }, index) => (
                <MenuItem key={index} value={value}>
                  {label}
                </MenuItem>
              ))}
            </MarkedSelect>
            <Box width={1}>
              <MarkedSelect
                label="Segment"
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
          <StyledButton type="submit" size="large" disabled={!values.lookback || !values.check || !values.frequency || !values.aggregation_window}>
            Save
          </StyledButton>
        </StyledButtonWrapper>
      </StyledStackContainer>
    </form>
  );
}
