import { Box, MenuItem, SelectChangeEvent } from "@mui/material";
import { useFormik } from "formik";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { MarkedSelect } from "../../../../components/MarkedSelect/MarkedSelect";
import { RangePicker } from "../../../../components/RangePicker/RangePicker";
import { useTypedDispatch, useTypedSelector } from "../../../../store/hooks";
import {
  checkSelector,
  getChecks,
  runCheck,
} from "../../../../store/slices/check/checkSlice";
import {
  getColumns,
  modelSelector,
} from "../../../../store/slices/model/modelSlice";
import {
  createMonitor,
  monitorSelector,
} from "../../../../store/slices/monitor/monitorSlice";
import { ColumnType } from "../../../../types/model";
import { Subcategory } from "../Subcategory/Subcategory";
import {
  StyledButton,
  StyledButtonWrapper,
  StyledStackContainer,
  StyledStackInputs,
  StyledTypography,
  StyledTypographyLabel,
} from "./MonitorForm.style";

const timeWindow = [
  { label: "1 hour", value: 60 * 60 },
  { label: "1 day", value: 60 * 60 * 24 },
  { label: "1 week", value: 60 * 60 * 24 * 7 },
  { label: "1 month", value: 60 * 60 * 24 * 31 },
];

interface CreateMonitorProps {
  onClose: () => void | undefined;
}

export function CreateMonitor({ onClose }: CreateMonitorProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const dispatch = useTypedDispatch();

  const { allModels, columns } = useTypedSelector(modelSelector);
  const { checks } = useTypedSelector(checkSelector);
  const { loading } = useTypedSelector(monitorSelector);

  const {
    values,
    handleChange,
    handleBlur,
    getFieldProps,
    setFieldValue,
    ...formik
  } = useFormik({
    initialValues: {
      category: "",
      check: "",
      column: "",
      model: "",
      numericValue: "",
      time: "",
    },
    onSubmit: (values) => {
      let operator;
      let value;

      const column = columns[values.column];

      if (column) {
        if (column.type === ColumnType.number) {
          operator = "greater_than";
          value = values.numericValue;
        }

        if (column.type === ColumnType.string) {
          operator = "in";
          value = values.category;
        }
      }

      dispatch(
        createMonitor({
          checkId: values.check,
          monitor: {
            name: checks.reduce((acc, item) => {
              if (item.id === values.check) {
                return item.name || acc;
              }

              return acc;
            }, ""),
            lookback: +values.time,
            data_filter: {
              filters: [
                {
                  column: values.column,
                  operator: operator || "in",
                  value: value || values.category,
                },
              ],
            },
          },
        })
      );
      formik.resetForm();
      onClose();
    },
  });

  const updateGraph = (operator = "", value: string | number = "") => {
    if (!operator) {
      dispatch(
        runCheck({
          checkId: +values.check,
          data: {
            start_time: new Date(Date.now() - +values.time * 1000),
            end_time: new Date(),
          },
        })
      );
      return;
    }

    dispatch(
      runCheck({
        checkId: +values.check,
        data: {
          start_time: new Date(Date.now() - +values.time * 1000),
          end_time: new Date(),
          filter: { filters: [{ column: values.column, operator, value }] },
        },
      })
    );
  };

  const handleModelChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    handleChange(event);
    setFieldValue("model", value);
    setFieldValue("check", "");
    setFieldValue("column", "");
    dispatch(getChecks(+value));
    dispatch(getColumns(+value));
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (!Array.isArray(newValue)) {
      setFieldValue("numericValue", newValue);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldValue(
      "numericValue",
      event.target.value ? +event.target.value : ""
    );
  };

  const handleInputBlur = () => {
    if (+values.numericValue < columns[values.column].values[0]) {
      setFieldValue("numericValue", columns[values.column].values[0]);
    } else if (+values.numericValue > columns[values.column].values[1]) {
      setFieldValue("numericValue", columns[values.column].values[1]);
    }
  };

  useMemo(() => {
    if (values.column) {
      const column = columns[values.column];

      if (column.type === ColumnType.string) {
        setColumnComponent(
          <Subcategory>
            <MarkedSelect
              label="Select category"
              size="small"
              disabled={!columns[values.column].values.length}
              fullWidth
              {...getFieldProps("category")}
            >
              {columns[values.column].values.map((col, index) => (
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
        setColumnComponent(
          <Box mt="39px">
            <StyledTypographyLabel>Select Value</StyledTypographyLabel>
            <RangePicker
              onChange={handleSliderChange}
              handleInputBlur={handleInputBlur}
              handleInputChange={handleInputChange}
              name="numericValue"
              value={+values.numericValue || 0}
              min={column.values[0]}
              max={column.values[1]}
              valueLabelDisplay="auto"
            />
          </Box>
        );
        return;
      }

      setColumnComponent(null);
    }
  }, [values.column, values.category, values.numericValue]);

  useEffect(() => {
    const column = columns[values.column];
    if (column && column.type === ColumnType.string) {
      setFieldValue("category", column.values[0]);
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
        if (
          values.check &&
          values.time &&
          values.column &&
          values.numericValue
        ) {
          timer.current = setTimeout(() => {
            updateGraph("greater_than", values.numericValue);
          }, 500);
        }
      }

      if (column.type === ColumnType.string) {
        if (values.check && values.time && values.column && values.category) {
          updateGraph("in", values.category);
        }
      }
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [
    values.check,
    values.column,
    values.category,
    values.numericValue,
    values.time,
  ]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <StyledStackContainer>
        <Box>
          <StyledTypography variant="h4">New Monitor</StyledTypography>
          <StyledStackInputs spacing="60px">
            <MarkedSelect
              label="Select model"
              onChange={handleModelChange}
              name="model"
              onBlur={handleBlur}
              size="small"
              value={values.model}
              fullWidth
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
              {...getFieldProps("check")}
              fullWidth
            >
              {checks.map(({ name, id }, index) => (
                <MenuItem key={index} value={id}>
                  {name}
                </MenuItem>
              ))}
            </MarkedSelect>
            <MarkedSelect
              label="Time Window"
              size="small"
              {...getFieldProps("time")}
              fullWidth
            >
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
                {...getFieldProps("column")}
                fullWidth
              >
                {Object.keys(columns).map((key) => (
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
            disabled={!values.time || !values.check || loading}
          >
            Save
          </StyledButton>
        </StyledButtonWrapper>
      </StyledStackContainer>
    </form>
  );
}
