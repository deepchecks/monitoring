import React, { memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Box, MenuItem, TextField } from '@mui/material';
import {
  MonitorSchema,
  useGetCheckInfoApiV1ChecksCheckIdInfoGet,
  OperatorsEnum,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet,
  useUpdateMonitorApiV1MonitorsMonitorIdPut
} from 'api/generated';
import { useFormik } from 'formik';
import { MarkedSelect } from '../../MarkedSelect';
import { RangePicker } from '../../RangePicker';
import { ColumnType, ColumnsSchema, ColumnStatsNumeric, ColumnStatsCategorical } from '../../../helpers/types/model';
import { Subcategory } from '../Subcategory';
import {
  StyledButton,
  StyledButtonWrapper,
  StyledStackContainer,
  StyledStackInputs,
  StyledTypography,
  StyledTypographyLabel
} from './MonitorForm.style';
import useModels from 'hooks/useModels';
import useRunMonitorLookback from 'hooks/useRunMonitorLookback';
import { LookbackCheckProps } from '../MonitorDrawer';
import useMonitorsData from '../../../hooks/useMonitorsData';
import { CheckInfo } from '../CheckInfo';

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
  const { modelsMap } = useModels();
  const { refreshMonitors } = useMonitorsData();
  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(monitor.check.id);

  const timer = useRef<ReturnType<typeof setTimeout>>();
  const modelId = useMemo(() => monitor?.check.model_id ?? null, [monitor]);

  useRunMonitorLookback(+monitor.id, modelId?.toString() ?? null);

  const { data: columns = {} as ColumnsSchema, isLoading: isColumnsLoading } =
    useGetModelColumnsApiV1ModelsModelIdColumnsGet(modelId!);

  const { mutateAsync: updateMonitor } = useUpdateMonitorApiV1MonitorsMonitorIdPut();

  const modelName = useMemo(() => {
    if (!modelId) return;
    return modelsMap[modelId].name;
  }, [modelId]);

  const checkInfoInitValue = () => ({
    check_conf: {}
  });

  const formikInitValues = {
    name: monitor.name,
    category: (monitor.data_filters?.filters[0].value as string) || '',
    column: (monitor.data_filters?.filters[0].column as string) || '',
    numericValue: (monitor.data_filters?.filters[0].value as number) || 0,
    time: monitor.lookback,
    additional_kwargs: monitor.additional_kwargs || checkInfoInitValue()
  };

  const { values, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: formikInitValues,
    onSubmit: async values => {
      let operator;
      let value;

      const column = columns[values.column];

      if (column?.type === ColumnType.numeric) {
        operator = OperatorsEnum.greater_than;
        value = values.numericValue;
      }

      if (column?.type === ColumnType.categorical) {
        operator = OperatorsEnum.contains;
        value = values.category;
      }

      const monitorSchema = {
        monitorId: monitor.id,
        data: {
          name: values.name || monitor.name,
          lookback: values.time,
          dashboard_id: monitor.dashboard_id,
          additional_kwargs: values.additional_kwargs,
          data_filters:
            values.column && operator && value
              ? {
                  filters: [
                    {
                      column: values.column,
                      operator: operator,
                      value: value
                    }
                  ]
                }
              : undefined
        }
      };

      await updateMonitor(monitorSchema);

      refreshMonitors(monitor);
      formik.resetForm();
      onClose();
    }
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
        start_time: new Date(Date.now() - +values.time * 1000).toISOString(),
        end_time,
        additional_kwargs: values.additional_kwargs
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
    const column = columns[values.column];

    if (column?.type === ColumnType.categorical) {
      const stats = column.stats as ColumnStatsCategorical;
      setColumnComponent(
        <Subcategory>
          <MarkedSelect
            label="Select category"
            size="small"
            clearValue={() => {setFieldValue('category', '')}}
            disabled={!stats.values.length}
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

    if (column?.type === ColumnType.numeric) {
      const stats = column.stats as ColumnStatsNumeric;
      setColumnComponent(
        <Box mt="39px">
          <StyledTypographyLabel>Select Value</StyledTypographyLabel>
          <RangePicker
            onChange={handleSliderChange}
            handleInputBlur={handleInputBlur}
            handleInputChange={handleInputChange}
            name="numericValue"
            value={+values.numericValue}
            min={stats.min}
            max={stats.max}
            valueLabelDisplay="auto"
          />
        </Box>
      );
      return;
    }
  }, [values.column, values.category, values.numericValue, isColumnsLoading]);

  useEffect(() => {
    clearTimeout(timer.current);
    const column = columns[values.column];

    if (!column && values.time) {
      updateGraph();
    }

    if (column) {
      if (column?.type === ColumnType.numeric) {
        if (values.time && values.column && values.numericValue) {
          timer.current = setTimeout(() => {
            updateGraph('greater_than', values.numericValue);
          }, 500);
        }
      }

      if (column?.type === ColumnType.categorical) {
        if (values.time && values.column && values.category) {
          updateGraph('contains', values.category);
        }
      }
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [values.column, values.category, values.numericValue, values.time, values.additional_kwargs]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <StyledStackContainer>
        <Box>
          <StyledTypography variant="h4">Edit Monitor</StyledTypography>
          <StyledStackInputs spacing="50px">
            <TextField variant="outlined" label="Monitor Name" {...getFieldProps('name')} size="small" />

            <TextField variant="outlined" label={`Model: ${modelName}`} size="small" disabled={true} />
            <TextField variant="outlined" label={`Check: ${monitor?.check.name}`} size="small" disabled={true} />

            {checkInfo && (
              <CheckInfo
                checkInfo={checkInfo}
                initialCheckInfoValues={values.additional_kwargs}
                setFieldValue={setFieldValue}
              />
            )}

            <MarkedSelect label="Time Window" clearValue={() => {setFieldValue('time', '')}} size="small" {...getFieldProps('time')} fullWidth>
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
                clearValue={() => {setFieldValue('column', '')}}
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
