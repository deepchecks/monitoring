import { Box, MenuItem, SelectChangeEvent, Typography } from "@mui/material";
import { ChartData } from "chart.js";
import { memo, useState } from "react";
import DiagramLine from "../../../components/DiagramLine/DiagramLine";
import {
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledFooter,
  StyledGraphColor,
  StyledGrid,
  StyledModel,
  StyledSelect,
  StyledTypographyTitle,
} from "./DataIngestion.style";

interface DataIngestionProps {
  data: ChartData<"line">;
  title: string;
}

function DataIngestionComponent({ data, title }: DataIngestionProps) {
  const [time, setTime] = useState("Last 7 days");

  const handleTime = (event: SelectChangeEvent<unknown>) => {
    setTime(event.target.value as string);
  };

  return (
    <StyledFlexContent>
      <Box>
        <StyledFlexWrapper>
          <StyledTypographyTitle>{title}</StyledTypographyTitle>
        </StyledFlexWrapper>
        <StyledDiagramWrapper>
          <DiagramLine data={data} />
          <StyledFooter>
            <StyledSelect value={time} onChange={handleTime} size="small">
              <MenuItem value="Last 7 days">Last 7 days</MenuItem>
            </StyledSelect>
            <StyledGrid>
              {data.datasets.map((data) => (
                <StyledModel key={data.label}>
                  <StyledGraphColor graphColor={data.borderColor as string} />
                  <Typography variant="body2">{data.label}</Typography>
                </StyledModel>
              ))}
            </StyledGrid>
          </StyledFooter>
        </StyledDiagramWrapper>
      </Box>
    </StyledFlexContent>
  );
}

export const DataIngestion = memo(DataIngestionComponent);
