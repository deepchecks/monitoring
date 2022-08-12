import { Box, MenuItem } from "@mui/material";
import { useFormik } from "formik";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { MarkedSelect } from "../../../../components/MarkedSelect/MarkedSelect";
import { RangePicker } from "../../../../components/RangePicker/RangePicker";
import { useTypedDispatch, useTypedSelector } from "../../../../store/hooks";
import {
  getColumns,
  modelSelector,
} from "../../../../store/slices/model/modelSlice";
import {
  getMonitor,
  monitorSelector,
  runMonitor,
  updateMonitor,
} from "../../../../store/slices/monitor/monitorSlice";
import { ID } from "../../../../types";
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
  { label: "1 month", value: 60 * 60 * 24 * 7 * 31 },
];

interface EditMonitorProps {
  monitorId: ID;
  onClose: () => void | undefined;
}

const getValue = (column: string, value: string | number) => {
  if (column === "a") {
    return value;
  }

  if (column === "b") {
    return value;
  }

  return "";
};

export function EditMonitor({ monitorId, onClose }: EditMonitorProps) {
  const [ColumnComponent, setColumnComponent] = useState<ReactNode>(null);

  const dispatch = useTypedDispatch();

  const { columns } = useTypedSelector(modelSelector);
  const { loading, monitor } = useTypedSelector(monitorSelector);
  const { values, getFieldProps, setFieldValue, ...formik } = useFormik({
    initialValues: {
      category: "",
      column: "",
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
        updateMonitor({
          checkId: monitor.check.id,
          monitor: {
            dashboard_id: monitor.dashboard_id,
            name: monitor.name,
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
    dispatch(getMonitor(monitorId));

    dispatch(runMonitor(monitorId));
  }, [dispatch]);

  useEffect(() => {
    if (Object.keys(monitor).length) {
      dispatch(getColumns(monitor.check.model_id));
      setFieldValue(
        "category",
        getValue(
          monitor.data_filter?.filters[0]?.column,
          monitor.data_filter?.filters[0]?.value
        )
      );
      setFieldValue("column", monitor.data_filter?.filters[0]?.column || "");
      setFieldValue(
        "numericValue",
        getValue(
          monitor.data_filter?.filters[0]?.column,
          monitor.data_filter?.filters[0]?.value
        )
      );
      setFieldValue("time", monitor.lookback);
    }
  }, [monitor]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <StyledStackContainer>
        <Box>
          <StyledTypography variant="h4">Create Monitor</StyledTypography>
          <StyledStackInputs spacing="60px">
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
            disabled={!values.time || loading}
          >
            Save
          </StyledButton>
        </StyledButtonWrapper>
      </StyledStackContainer>
    </form>
  );
}
