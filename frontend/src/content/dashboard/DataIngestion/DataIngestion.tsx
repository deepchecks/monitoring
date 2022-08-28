import { Box, MenuItem, SelectChangeEvent } from "@mui/material";
import { useEffect, useState } from "react";
import DiagramLine from "../../../components/DiagramLine/DiagramLine";
import { useTypedDispatch, useTypedSelector } from "../../../store/hooks";
import {
  getAllDataIngestion,
  modelGraphSelector,
  modelSelector,
} from "../../../store/slices/model/modelSlice";
import {
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledFooter,
  StyledSelect,
  StyledTypographyTitle,
} from "./DataIngestion.style";

const times = [
  { label: "Last day", value: 60 * 60 * 24 },
  { label: "Last 7 days", value: 60 * 60 * 24 * 7 },
  { label: "Last month", value: 60 * 60 * 24 * 31 },
];

const initTime = times[1].value;

export function DataIngestion() {
  const [time, setTime] = useState(initTime.toString());
  const { loading } = useTypedSelector(modelSelector);
  const dataIngestion = useTypedSelector(modelGraphSelector);

  const dispatch = useTypedDispatch();

  const handleTime = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    setTime(value);
  };

  useEffect(() => {
    dispatch(getAllDataIngestion(+time));
  }, [dispatch, time]);

  return (
    <StyledFlexContent>
      <Box>
        <StyledFlexWrapper>
          <StyledTypographyTitle>Prediction Data Status</StyledTypographyTitle>
        </StyledFlexWrapper>
        <StyledDiagramWrapper>
          <DiagramLine data={dataIngestion} />
          <StyledFooter>
            <StyledSelect
              value={time}
              onChange={handleTime}
              size="small"
              disabled={loading}
            >
              {times.map(({ label, value }) => (
                <MenuItem value={value.toString()} key={label}>
                  {label}
                </MenuItem>
              ))}
            </StyledSelect>
          </StyledFooter>
        </StyledDiagramWrapper>
      </Box>
    </StyledFlexContent>
  );
}
