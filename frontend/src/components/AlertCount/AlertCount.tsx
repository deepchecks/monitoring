import { memo } from "react";
import { ChartSvg } from "../../assets/icon/chart";
import {
  StyledBoxWrapper,
  StyledTypographyMessage,
  StyledTypographyTitle,
} from "./AlertCount.style";

interface AlertCountComponentProps {
  color?: string;
  criticality: number;
  count: number;
  message: string;
}

const criticalityMap: { [key: string]: { [key: string]: boolean } } = {
  "1": {
    first: true,
  },
  "2": {
    first: true,
    second: true,
  },
  "3": {
    first: true,
    second: true,
    third: true,
  },
};

function AlertCountComponent({
  color = "#FF833D",
  criticality = 1,
  count,
  message,
}: AlertCountComponentProps) {
  return (
    <StyledBoxWrapper bgColor={color}>
      <ChartSvg {...criticalityMap[criticality.toString()]} />
      <StyledTypographyTitle>{count}</StyledTypographyTitle>
      <StyledTypographyMessage>{message}</StyledTypographyMessage>
    </StyledBoxWrapper>
  );
}

export const AlertCount = memo(AlertCountComponent);
