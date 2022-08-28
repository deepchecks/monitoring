import {
  Button,
  MenuItem,
  SelectChangeEvent,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sort } from "../../../assets/icon/icon";
import { DatePicker } from "../../../components/DatePicker/DatePicker";
import { SelectPrimary } from "../../../components/SelectPrimary/SelectPrimary";
import { useTypedDispatch, useTypedSelector } from "../../../store/hooks";
import {
  alertSelector,
  getAlertRules,
} from "../../../store/slices/alert/alertSlice";
import { modelSelector } from "../../../store/slices/model/modelSlice";
import { AlertRulesParams, Criticality, SortBy } from "../../../types/alert";
import {
  StyledDateWrapper,
  StyledDivider,
  StyledMainWrapper,
} from "./AlertFilters.style";

const severityList = [
  { label: "All", value: "All" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Mid", value: "mid" },
  { label: "Low", value: "low" },
];

export function AlertFilters() {
  const location = useLocation();
  const state = location.state as { modelId: number } | null;
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(Date.now() - 60 * 60 * 24 * 7 * 1000)
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date(Date.now()));
  const [sortedBy, setSortedBy] = useState<SortBy | null>(null);
  const [params, setParams] = useState<AlertRulesParams>(() => {
    const options: AlertRulesParams = {};
    if (state) {
      options.models = state.modelId;
    }
    return {
      start: startDate?.toISOString(),
      end: endDate?.toISOString(),
      ...options,
    };
  });

  const dispatch = useTypedDispatch();

  const [model, setModel] = useState<number>(state ? state.modelId : -1);
  const [severity, setSeverity] = useState<Criticality | "All">("All");
  const { allModels } = useTypedSelector(modelSelector);
  const { loading } = useTypedSelector(alertSelector);

  const handleModelChange = (event: SelectChangeEvent<number | unknown>) => {
    const currentModel = event.target.value as number;
    setModel(currentModel);
    if (currentModel === -1 && params.models) {
      setParams((prevParams) => {
        const currentParams = { ...prevParams };
        delete currentParams.models;
        return currentParams;
      });
      return;
    }
    setParams((prevParams) => ({ ...prevParams, models: currentModel }));
  };

  const handleSeverityChange = (event: SelectChangeEvent<unknown>) => {
    const currentSeverity = event.target.value as Criticality | "All";
    setSeverity(currentSeverity);
    if (currentSeverity === "All" && params.severity) {
      setParams((prevParams) => {
        const currentParams = { ...prevParams };
        delete currentParams.severity;
        return currentParams;
      });
      return;
    }
    setParams((prevParams) => ({
      ...prevParams,
      severity: currentSeverity as Criticality,
    }));
  };

  const handleStartDateChange = (currentStartDate: Date | null) => {
    if (currentStartDate && startDate && currentStartDate < startDate) {
      setStartDate(currentStartDate);
      setParams((prevParams) => ({
        ...prevParams,
        start: currentStartDate.toISOString(),
      }));
    }
  };

  const handleEndDateChange = (currentEndDate: Date | null) => {
    if (currentEndDate && startDate && currentEndDate > startDate) {
      setEndDate(currentEndDate);
      setParams((prevParams) => ({
        ...prevParams,
        end: currentEndDate.toISOString(),
      }));
    }
  };

  const clickSort = () => {
    let sort: SortBy | null = null;
    setSortedBy((prevSortedBy) => {
      if (prevSortedBy) {
        return sort;
      }
      sort = "severity:asc";
      return sort;
    });

    if (sort) {
      setParams((prevParams) => ({
        ...prevParams,
        sortby: sort as SortBy,
      }));
      return;
    }

    setParams((prevParams) => {
      const currentParams = { ...prevParams };
      delete currentParams.sortby;
      return currentParams;
    });
  };

  useEffect(() => {
    dispatch(getAlertRules(params));
  }, [model, severity, startDate, endDate, sortedBy]);

  return (
    <StyledMainWrapper>
      <Stack direction="row">
        <StyledDateWrapper>
          <DatePicker
            inputFormat="DD MMM YYYY"
            onChange={handleStartDateChange}
            value={startDate}
            label="Start Date"
            disableMaskedInput
            disabled={loading}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
          -
          <DatePicker
            inputFormat="DD MMM YYYY"
            onChange={handleEndDateChange}
            value={endDate}
            label="End Date"
            disableMaskedInput
            disabled={loading}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
        </StyledDateWrapper>
        <StyledDivider orientation="vertical" flexItem />
        <Stack direction="row" spacing="16px">
          <SelectPrimary
            label="Model"
            onChange={handleModelChange}
            size="small"
            value={model}
            disabled={loading}
          >
            <MenuItem value={-1}>All</MenuItem>
            {allModels.map(({ id, name }) => (
              <MenuItem value={id} key={id}>
                {name}
              </MenuItem>
            ))}
          </SelectPrimary>
          <SelectPrimary
            label="Severity"
            onChange={handleSeverityChange}
            size="small"
            value={severity}
            disabled={loading}
          >
            {severityList.map(({ label, value }) => (
              <MenuItem value={value} key={label}>
                {label}
              </MenuItem>
            ))}
          </SelectPrimary>
        </Stack>
      </Stack>
      <Button
        variant="text"
        startIcon={<Sort />}
        onClick={clickSort}
        disabled={loading}
      >
        Sort
      </Button>
    </StyledMainWrapper>
  );
}
