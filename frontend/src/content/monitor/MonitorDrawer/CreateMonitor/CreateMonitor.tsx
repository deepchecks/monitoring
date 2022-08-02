import { Box, MenuItem, SelectChangeEvent } from "@mui/material";
import { useFormik } from "formik";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { MarkedSelect } from "../../../../components/MarkedSelect/MarkedSelect";
import { RangePicker } from "../../../../components/RangePicker/RangePicker";
import {
  useCheckSelector,
  useModelSelector,
  useMonitorSelector,
  useTypedDispatch,
} from "../../../../hook/redux";
import { getChecks, runCheck } from "../../../../store/requests/check";
import { getColumns, getModels } from "../../../../store/requests/model";
import { createMonitor } from "../../../../store/requests/monitor";
import { clearCheckState } from "../../../../store/slices/CheckSlice";
import { clearColumns } from "../../../../store/slices/ModelSlice";
import { Subcategory } from "../Subcategory/Subcategory";
import {
  StyledButton,
  StyledButtonWrapper,
  StyledStackContainer,
  StyledStackInputs,
  StyledTypography,
  StyledTypographyLabel,
} from "./CreateMonitor.style";

const timeWindow = [
  { label: "1 hour", value: 60 * 60 },
  { label: "1 day", value: 60 * 60 * 24 },
  { label: "1 week", value: 60 * 60 * 24 * 7 },
  { label: "1 month", value: 60 * 60 * 24 * 7 * 31 },
];

interface CreateMonitorProps {
  onClose: () => void | undefined;
}

export function CreateMonitor({ onClose }: CreateMonitorProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);

  const dispatch = useTypedDispatch();

  const { allModels, columns } = useModelSelector();
  const { checks } = useCheckSelector();
  const { loading } = useMonitorSelector();

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

      if (values.column === "a") {
        operator = "greater_than";
        value = values.numericValue;
      }

      if (values.column === "b") {
        operator = "in";
        value = values.category;
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
              column: values.column,
              operator: operator || "in",
              value: value || values.category,
            },
          },
        })
      );
      dispatch(clearCheckState());
      dispatch(clearColumns());
      formik.resetForm();
      onClose();
    },
  });

  const handleModelChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    handleChange(event);
    setFieldValue("model", value);
    setFieldValue("check", "");
    setFieldValue("column", "");
    dispatch(getChecks(+value));
    dispatch(getColumns(+value));
  };

  const updateGraph = (operator: string, value: string | number) => {
    dispatch(
      runCheck({
        checkId: +values.check,
        data: {
          lookback: +values.time,
          filter: { column: values.column, operator, value },
        },
      })
    );
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
    if (+values.numericValue < columns.a.values[0]) {
      setFieldValue("numericValue", columns.a.values[0]);
    } else if (+values.numericValue > columns.a.values[1]) {
      setFieldValue("numericValue", columns.a.values[1]);
    }
  };

  useMemo(() => {
    if (values.column === "b") {
      setColumnComponent(
        <Subcategory>
          <MarkedSelect
            label="Select category"
            size="small"
            disabled={!columns.b.values.length}
            fullWidth
            {...getFieldProps("category")}
          >
            {columns.b.values.map((col, index) => (
              <MenuItem key={index} value={col}>
                {col}
              </MenuItem>
            ))}
          </MarkedSelect>
        </Subcategory>
      );
      return;
    }

    if (values.column === "a") {
      setColumnComponent(
        <Box mt="39px">
          <StyledTypographyLabel>Select Value</StyledTypographyLabel>
          <RangePicker
            onChange={handleSliderChange}
            handleInputBlur={handleInputBlur}
            handleInputChange={handleInputChange}
            name="numericValue"
            value={+values.numericValue || 0}
            min={columns.a.values[0]}
            max={columns.a.values[1]}
            valueLabelDisplay="auto"
          />
        </Box>
      );
      return;
    }

    setColumnComponent(null);
  }, [values.column, values.category, values.numericValue]);

  useEffect(() => {
    if (values.column === "b") {
      setFieldValue("category", columns.b.values[0]);
    }
  }, [values.column]);

  useEffect(() => {
    clearTimeout(timer.current);

    if (values.column === "a") {
      if (values.check && values.time && values.column && values.numericValue) {
        timer.current = setTimeout(() => {
          updateGraph("greater_than", values.numericValue);
        }, 1000);
      }
    }

    if (values.column === "b") {
      if (values.check && values.time && values.column && values.category) {
        timer.current = setTimeout(() => {
          updateGraph("in", values.category);
        }, 1000);
      }
    }
  }, [values.check, values.column, values.category, values.numericValue]);

  useEffect(() => {
    dispatch(clearCheckState());
    dispatch(clearColumns());
    if (!allModels.length) {
      dispatch(getModels());
    }
  }, [dispatch]);

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
