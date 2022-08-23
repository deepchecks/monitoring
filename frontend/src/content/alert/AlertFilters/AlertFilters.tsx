import { Button, MenuItem, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { Sort } from "../../../assets/icon/icon";
import { DatePicker } from "../../../components/DatePicker/DatePicker";
import { SelectPrimary } from "../../../components/SelectPrimary/SelectPrimary";
import { useSelector } from "../../../hook/useSelector";
import { useTypedSelector } from "../../../store/hooks";
import { modelSelector } from "../../../store/slices/model/modelSlice";
import {
  StyledDateWrapper,
  StyledDivider,
  StyledMainWrapper,
} from "./AlertFilters.style";

const severityList = ["All", "Critical", "High", "Mid", "Low"];

export function AlertFilters() {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [model, handleModelChange] = useSelector("All");
  const [severity, handleSeverityChange] = useSelector("All");

  const { allModels } = useTypedSelector(modelSelector);

  const handleStartDateChange = (newValue: Date | null) => {
    setStartDate(newValue);
  };

  const handleEndDateChange = (newValue: Date | null) => {
    setEndDate(newValue);
  };

  return (
    <StyledMainWrapper>
      <Stack direction="row">
        <StyledDateWrapper>
          <DatePicker
            inputFormat="dd MMM yyyy"
            onChange={handleStartDateChange}
            value={startDate}
            label="Start Date"
            disableMaskedInput
            renderInput={(params) => <TextField {...params} size="small" />}
          />
          -
          <DatePicker
            inputFormat="dd MMM yyyy"
            onChange={handleEndDateChange}
            value={endDate}
            label="End Date"
            disableMaskedInput
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
          >
            <MenuItem value="All">All</MenuItem>
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
          >
            {severityList.map((item) => (
              <MenuItem value={item} key={item}>
                {item}
              </MenuItem>
            ))}
          </SelectPrimary>
        </Stack>
      </Stack>
      <Button variant="text" startIcon={<Sort />}>
        Sort
      </Button>
    </StyledMainWrapper>
  );
}
