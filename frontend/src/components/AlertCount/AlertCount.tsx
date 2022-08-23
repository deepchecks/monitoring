import { Typography, useTheme } from "@mui/material";
import { memo, useState } from "react";
import { ChartSvg } from "../../assets/icon/chart";
import { Criticality } from "../../types/alert";
import {
  StyledBoxWrapper,
  StyledCriticality,
  StyledTypographyMessage,
  StyledValueWrapper,
} from "./AlertCount.style";

interface AlertCountComponentProps {
  criticality: Criticality;
  count: number;
}

function AlertCountComponent({
  criticality = "high",
  count,
}: AlertCountComponentProps) {
  const theme = useTheme();

  const [criticalityMap] = useState({
    low: {
      color: theme.palette.error.contrastText,
    },
    mid: {
      color: theme.palette.error.light,
      first: true,
    },
    high: {
      color: theme.palette.error.dark,
      first: true,
      second: true,
    },
    critical: {
      color: theme.palette.error.main,
      first: true,
      second: true,
      third: true,
    },
  });

  const { color, ...criticalityRange } = criticalityMap[criticality];

  return (
    <StyledBoxWrapper bgColor={color}>
      <StyledCriticality bgColor={color}>
        <ChartSvg {...criticalityRange} width={18} height={16} />
      </StyledCriticality>
      <StyledValueWrapper textColor={color}>
        <Typography variant="h5">{count}</Typography>
        <StyledTypographyMessage>{criticality}</StyledTypographyMessage>
      </StyledValueWrapper>
    </StyledBoxWrapper>
  );
}

export const AlertCount = memo(AlertCountComponent);
