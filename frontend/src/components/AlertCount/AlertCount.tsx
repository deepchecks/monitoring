import { useTheme } from "@mui/material";
import { memo, useState } from "react";
import { ChartSvg } from "../../assets/icon/chart";
import {
  StyledBoxWrapper,
  StyledTypographyMessage,
  StyledTypographyTitle,
} from "./AlertCount.style";

interface AlertCountComponentProps {
  criticality: "critical" | "high" | "medium" | "low";
  count: number;
  message: string;
}

function AlertCountComponent({
  criticality = "high",
  count,
  message,
}: AlertCountComponentProps) {
  const theme = useTheme();

  const [criticalityMap] = useState({
    low: {
      color: theme.palette.error.contrastText,
    },
    medium: {
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
      <ChartSvg {...criticalityRange} />
      <StyledTypographyTitle>{count}</StyledTypographyTitle>
      <StyledTypographyMessage>{message}</StyledTypographyMessage>
    </StyledBoxWrapper>
  );
}

export const AlertCount = memo(AlertCountComponent);
