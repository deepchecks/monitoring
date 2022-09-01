import React, { memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Box, MenuItem } from '@mui/material';
import {
  ModelsInfoSchema,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet,
  useGetModelsApiV1ModelsGet,
  useGetMonitorApiV1MonitorsMonitorIdGet,
  useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost
} from 'api/generated';
import { useFormik } from 'formik';
import { MarkedSelect } from '../../MarkedSelect';
import { RangePicker } from '../../RangePicker';
import { Numeric, Categorical, ColumnType, ModelColumns } from '../../../helpers/types/model';
import { ID } from '../../../helpers/types';
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

const timeWindow = [
  { label: '1 hour', value: 60 * 60 },
  { label: '1 day', value: 60 * 60 * 24 },
  { label: '1 week', value: 60 * 60 * 24 * 7 },
  { label: '1 month', value: 60 * 60 * 24 * 31 }
];

interface EditMonitorProps {
  monitorId: ID;
  onClose: () => void | undefined;
}

function EditMonitor({ monitorId, onClose }: EditMonitorProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { data: monitor } = useGetMonitorApiV1MonitorsMonitorIdGet(+monitorId);

  const modelId = useMemo(() => monitor?.check.model_id ?? null, [monitor]);
  useRunMonitorLookback(+monitorId, modelId?.toString() ?? null);
  const { data: columns = {} as ModelColumns, isLoading: isColumnsLoading } =
    useGetModelColumnsApiV1ModelsModelIdColumnsGet(modelId!);

  //const runMonitor = useRunMonitorLookbackApiV1MonitorsMonitorIdRunPost();
  //const modelsMap = useModelsMap();

  //useEffect(() => {
  //const modelId = monitor?.check.model_id;
  //if (!modelId) return;

  //const monitorModel = modelsMap[modelId];

  //if (!monitorModel) return;

  //const end_time = monitorModel.latest_time?.toString() ?? void 0;
  //runMonitor.mutateAsync({ monitorId: monitor.id, data: { end_time } });
  //}, [modelsMap, monitor]);

  const { values, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: {
      category: '',
      column: '',
      numericValue: '',
      time: ''
    },
    onSubmit: values => {
      let operator;
      let value;

      const column = columns[values.column];

      if (column.type === ColumnType.number) {
        operator = 'greater_than';
        value = values.numericValue;
      }

      if (column.type === ColumnType.string) {
        operator = 'in';
        value = values.category;
      }

      //   dispatch(
      //     updateMonitor({
      //       monitorId: monitor.id,
      //       monitor: {
      //         dashboard_id: monitor.dashboard_id,
      //         name: monitor.name,
      //         lookback: +values.time,
      //         data_filter: {
      //           filters: [
      //             {
      //               column: values.column,
      //               operator: operator || 'in',
      //               value: value || values.category
      //             }
      //           ]
      //         }
      //       }
      //     })
      //   );
      formik.resetForm();
      onClose();
    }
  });

  const updateGraph = (operator = '', value: string | number = '') => {
    if (!operator) {
      //   dispatch(
      //     runCheck({
      //       checkId: +monitor.check.id,
      //       data: {
      //         start_time: new Date(Date.now() - +values.time * 1000),
      //         end_time: new Date()
      //       }
      //     })
      //   );
      return;
    }

    // dispatch(
    //   runCheck({
    //     checkId: +monitor.check.id,
    //     data: {
    //       start_time: new Date(Date.now() - +values.time * 1000),
    //       end_time: new Date(),
    //       filter: { filters: [{ column: values.column, operator, value }] }
    //     }
    //   })
    // );
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
    if (values.column) {
      let column = columns[values.column];

      if (column.type === ColumnType.string) {
        column = column as Categorical;
        setColumnComponent(
          <Subcategory>
            <MarkedSelect
              label="Select category"
              size="small"
              disabled={!column.values.length}
              fullWidth
              {...getFieldProps('category')}
            >
              {column.values?.map((col, index) => (
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

      setColumnComponent(null);
    }
  }, [values.column, values.category, values.numericValue]);

  //   useEffect(() => {
  //     const column = columns[values.column];
  //     if (column && column.type === ColumnType.string) {
  //       setFieldValue('category', column.values[0]);
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
      if (column.type === ColumnType.number) {
        if (values.time && values.column && values.numericValue) {
          timer.current = setTimeout(() => {
            updateGraph('greater_than', values.numericValue);
          }, 500);
        }
      }

      if (column.type === ColumnType.string) {
        if (values.time && values.column && values.category) {
          updateGraph('in', values.category);
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
