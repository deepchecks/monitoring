import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Box, MenuItem, SelectChangeEvent, TextField } from '@mui/material';
import { useFormik } from 'formik';
import { MarkedSelect } from '../../MarkedSelect';
import { RangePicker } from '../../RangePicker';
import { Numeric, ColumnType, ModelColumns, Categorical } from '../../../helpers/types/model';
import { Subcategory } from '../Subcategory';
import {
  StyledButton,
  StyledButtonWrapper,
  StyledStackContainer,
  StyledStackInputs,
  StyledTypography,
  StyledTypographyLabel
} from './MonitorForm.style';
import {
  useGetModelsApiV1ModelsGet,
  useGetChecksApiV1ModelsModelIdChecksGet,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet,
  useCreateMonitorApiV1ChecksCheckIdMonitorsPost,
  MonitorCreationSchema
} from 'api/generated';
import useGlobalState from 'Context';

import useMonitorsData from '../../../hooks/useMonitorsData';
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
  runCheckLookback: (props: LookbackCheckProps) => void;
}

export function CreateMonitor({ onClose, runCheckLookback }: CreateMonitorProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);
  const [selectedModelId, setSelectedModelId] = useState(Number);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { refreshMonitors } = useMonitorsData();
  const globalState = useGlobalState();

  const { data: allModels = [] } = useGetModelsApiV1ModelsGet();
  const { data: columns = {} as ModelColumns } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(selectedModelId);
  const { data: checks = [] } = useGetChecksApiV1ModelsModelIdChecksGet(selectedModelId);

  const { mutateAsync: createMonitor } = useCreateMonitorApiV1ChecksCheckIdMonitorsPost();

  const { values, handleChange, handleBlur, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: {
      name: '',
      category: '',
      check: '',
      column: '',
      model: '',
      numericValue: '',
      time: ''
    },
    onSubmit: async values => {
      let operator;
      let value;

      const column = columns[values.column];

      if (column) {
        if (column.type === ColumnType.number) {
          operator = 'greater_than';
          value = values.numericValue;
        }

        if (column.type === ColumnType.string) {
          operator = 'contains';
          value = values.category;
        }
      }

      const monitorSchema: MonitorCreationSchema = {
        name: values.name,
        lookback: +values.time,
        description: '',
        data_filters: {
          filters: [
            {
              column: values.column,
              operator: operator || 'contains',
              value: value || values.category
            }
          ]
        },
        dashboard_id: globalState.dashboard_id
        // filter_key: ''
      };

      await createMonitor({ checkId: parseInt(values.check), data: monitorSchema });
      refreshMonitors();
      formik.resetForm();
      onClose();
    }
  });

  const updateGraph = (operator = '', value: string | number = '') => {
    const checkId = +values.check;

    const lookbackCheckData: LookbackCheckProps = {
      checkId,
      data: {
        start_time: new Date(Date.now() - +values.time * 1000).toISOString(),
        end_time: new Date().toISOString()
      }
    };

    if (operator) {
      lookbackCheckData.data.filter = {
        filters: [{ column: values.column, operator, value }]
      };
    }

    runCheckLookback(lookbackCheckData);
  };

  const handleModelChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    handleChange(event);
    setSelectedModelId(+value);

    setFieldValue('model', value);
    setFieldValue('check', '');
    setFieldValue('column', '');
    setFieldValue('category', '');
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
    const column = columns[values.column] as Numeric;
    if (+values.numericValue < column.min) {
      setFieldValue('numericValue', column.min);
    } else if (+values.numericValue > column.max) {
      setFieldValue('numericValue', column.max);
    }
  };

  useMemo(() => {
    if (!values.column) {
      return setColumnComponent(null);
    }
    if (values.column) {
      let column = columns[values.column];

      if (column.type === ColumnType.string) {
        column = column as Categorical;
        setColumnComponent(
          <Subcategory>
            <MarkedSelect
              label="Select category"
              size="small"
              disabled={!column.stats.values.length}
              fullWidth
              {...getFieldProps('category')}
            >
              {column.stats.values.map((col: string, index: number) => (
                <MenuItem key={index} value={col}>
                  {col}
                </MenuItem>
              ))}
            </MarkedSelect>
          </Subcategory>
        );
        return;
      }

      if (column.type === ColumnType.number) {
        column = column as Numeric;
        setColumnComponent(
          <Box mt="39px">
            <StyledTypographyLabel>Select Value</StyledTypographyLabel>
            <RangePicker
              onChange={handleSliderChange}
              handleInputBlur={handleInputBlur}
              handleInputChange={handleInputChange}
              name="numericValue"
              value={+values.numericValue || 0}
              min={column.min}
              max={column.max}
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
    if (column && column.type === ColumnType.string) {
      setFieldValue('category', column.stats.values[0]);
    }
  }, [values.column]);

  useEffect(() => {
    clearTimeout(timer.current);
    const column = columns[values.column];

    if (!column && values.check && values.time) {
      updateGraph();
    }

    if (column) {
      if (column.type === ColumnType.number) {
        if (values.check && values.time && values.column && values.numericValue) {
          timer.current = setTimeout(() => {
            updateGraph('greater_than', values.numericValue);
          }, 500);
        }
      }

      if (column.type === ColumnType.string) {
        if (values.check && values.time && values.column && values.category) {
          updateGraph('contains', values.category);
        }
      }
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [values.check, values.column, values.category, values.numericValue, values.time]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <StyledStackContainer>
        <Box>
          <StyledTypography variant="h4">New Monitor</StyledTypography>
          <StyledStackInputs spacing="60px">
            <TextField label="Monitor Name" variant="outlined" size="small" {...getFieldProps('name')} required />
            <MarkedSelect
              label="Select Model"
              onChange={handleModelChange}
              name="model"
              onBlur={handleBlur}
              size="small"
              value={values.model}
              fullWidth
              required
            >
              {allModels.map(({ name, id }, index) => (
                <MenuItem key={index} value={id}>
                  {name}
                </MenuItem>
              ))}
            </MarkedSelect>
            <MarkedSelect
              label="Select Check"
              size="small"
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
            <MarkedSelect label="Time Window" size="small" {...getFieldProps('time')} fullWidth required>
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
          <StyledButton type="submit" size="large" disabled={!values.time || !values.check}>
            Save
          </StyledButton>
        </StyledButtonWrapper>
      </StyledStackContainer>
    </form>
  );
}
