import React, { memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Box, MenuItem, TextField } from '@mui/material';
import {
  MonitorSchema,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet,
  useUpdateMonitorApiV1MonitorsMonitorIdPut
} from 'api/generated';
import { useFormik } from 'formik';
import { MarkedSelect } from '../../MarkedSelect';
import { RangePicker } from '../../RangePicker';
import { Numeric, Categorical, ColumnType, ModelColumns } from '../../../helpers/types/model';
import { Subcategory } from '../Subcategory';
import {
  StyledButton,
  StyledButtonWrapper,
  StyledStackContainer,
  StyledStackInputs,
  StyledTypography,
  StyledTypographyLabel
} from './MonitorForm.style';
import useModelsMap from 'hooks/useModelsMap';
import useRunMonitorLookback from 'hooks/useRunMonitorLookback';
import { LookbackCheckProps } from '../MonitorDrawer';
import useMonitorsData from '../../../hooks/useMonitorsData';

const timeWindow = [
  { label: '1 hour', value: 60 * 60 },
  { label: '1 day', value: 60 * 60 * 24 },
  { label: '1 week', value: 60 * 60 * 24 * 7 },
  { label: '1 month', value: 60 * 60 * 24 * 31 },
  { label: '3 months', value: 60 * 60 * 24 * 31 * 3 }
];

interface EditMonitorProps {
  monitor: MonitorSchema;
  onClose: () => void | undefined;
  runCheckLookback: (props: LookbackCheckProps) => void;
}

function EditMonitor({ monitor, onClose, runCheckLookback }: EditMonitorProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);
  const models = useModelsMap();
  const { refreshMonitors } = useMonitorsData();

  const timer = useRef<ReturnType<typeof setTimeout>>();
  const modelId = useMemo(() => monitor?.check.model_id ?? null, [monitor]);

  useRunMonitorLookback(+monitor.id, modelId?.toString() ?? null);

  const { data: columns = {} as ModelColumns, isLoading: isColumnsLoading } =
    useGetModelColumnsApiV1ModelsModelIdColumnsGet(modelId!);

  const { mutateAsync: updateMonitor } = useUpdateMonitorApiV1MonitorsMonitorIdPut();

  const modelName = useMemo(() => {
    if (!modelId) return;
    return models[modelId].name;
  }, [modelId]);

  const initValues = {
    name: monitor.name,
    category: (monitor.data_filters?.filters[0].value as string) || '',
    column: monitor.data_filters?.filters[0].column || '',
    numericValue: (monitor.data_filters?.filters[0]?.value as number) || 0,
    time: monitor.lookback
  };

  const { values, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: initValues,
    onSubmit: async values => {
      let operator;
      let value;

      const column = columns[values.column];

      if (column?.type === ColumnType.number) {
        operator = 'greater_than';
        value = values.numericValue;
      }

      if (column?.type === ColumnType.string) {
        operator = 'contains';
        value = values.category;
      }

      await updateMonitor({
        monitorId: monitor.id,
        data: {
          name: values.name || monitor.name,
          lookback: values.time,
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
          dashboard_id: monitor.dashboard_id
          // filter_key: ''
        }
      });

      refreshMonitors(monitor);
      formik.resetForm();
      onClose();
    }
  });

  const updateGraph = (operator = '', value: string | number = '') => {
    if (!monitor) return;

    const checkId = +monitor.check.id;

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
    let column = columns[values.column];

    if (column?.type === ColumnType.string) {
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
            {column.stats.values?.map((col: string, index: number) => (
              <MenuItem key={index} value={col}>
                {col}
              </MenuItem>
            ))}
          </MarkedSelect>
        </Subcategory>
      );
      return;
    }

    if (column?.type === ColumnType.number) {
      column = column as Numeric;
      setColumnComponent(
        <Box mt="39px">
          <StyledTypographyLabel>Select Value</StyledTypographyLabel>
          <RangePicker
            onChange={handleSliderChange}
            handleInputBlur={handleInputBlur}
            handleInputChange={handleInputChange}
            name="numericValue"
            value={+values.numericValue}
            min={column.min}
            max={column.max}
            valueLabelDisplay="auto"
          />
        </Box>
      );
      return;
    }
  }, [values.column, values.category, values.numericValue]);

  //   useEffect(() => {
  //     const column = columns[values.column];
  //     if (column && column?.type === ColumnType.string) {
  //       setFieldValue('category', column.stats.values[0]);
  //     }
  //   }, [values.column]);

  //   useEffect(() => {
  //     dispatch(getMonitor(monitorId));
  //     dispatch(runMonitor(monitorId));
  //   }, [dispatch]);

  //   useEffect(() => {
  //     if (Object.keys(monitor).length) {
  //       dispatch(getColumns(monitor.check.model_id));
  //       setFieldValue(
  //         'category',
  //         getValue(monitor.data_filter?.filters[0]?.column, monitor.data_filter?.filters[0]?.value)
  //       );
  //       setFieldValue('column', monitor.data_filter?.filters[0]?.column || '');
  //       setFieldValue(
  //         'numericValue',
  //         getValue(monitor.data_filter?.filters[0]?.column, monitor.data_filter?.filters[0]?.value)
  //       );
  //       setFieldValue('time', monitor.lookback);
  //     }
  //   }, [monitor]);

  useEffect(() => {
    clearTimeout(timer.current);
    const column = columns[values.column];

    if (!column && values.time) {
      updateGraph();
    }

    if (column) {
      if (column?.type === ColumnType.number) {
        if (values.time && values.column && values.numericValue) {
          timer.current = setTimeout(() => {
            updateGraph('greater_than', values.numericValue);
          }, 500);
        }
      }

      if (column?.type === ColumnType.string) {
        if (values.time && values.column && values.category) {
          updateGraph('contains', values.category);
        }
      }
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [values.column, values.category, values.numericValue, values.time]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <StyledStackContainer>
        <Box>
          <StyledTypography variant="h4">Edit Monitor</StyledTypography>
          <StyledStackInputs spacing="60px">
            <TextField variant="outlined" label="Monitor Name" {...getFieldProps('name')} size="small" />

            <TextField variant="outlined" label={`Model: ${modelName}`} size="small" disabled={true} />
            <TextField variant="outlined" label={`Check: ${monitor?.check.name}`} size="small" disabled={true} />

            <MarkedSelect label="Time Window" size="small" {...getFieldProps('time')} fullWidth>
              {timeWindow.map(({ label, value }, index) => (
                <MenuItem key={index} value={value}>
                  {label}
                </MenuItem>
              ))}
            </MarkedSelect>
            <Box width={1}>
              <MarkedSelect
                label="Filter by Column"
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
          <StyledButton type="submit" size="large" disabled={!values.time || isColumnsLoading}>
            Save
          </StyledButton>
        </StyledButtonWrapper>
      </StyledStackContainer>
    </form>
  );
}

export default memo(EditMonitor);
