import { Box } from "@mui/material";
import { ChartData } from "chart.js";
import { memo } from "react";
import DiagramLine from "../../../components/DiagramLine/DiagramLine";
import {
  StyledFlexContent,
  StyledTypographyTitle,
} from "./GraphicsSection.style";

interface GraphicsSectionProps {
  className: string;
  data: ChartData<"line">;
  title: string;
}

function GraphicsSectionComponent({
  className,
  data,
  title,
}: GraphicsSectionProps) {
  return (
    <StyledFlexContent className={className}>
      <Box>
        <StyledTypographyTitle>{title}</StyledTypographyTitle>
        <DiagramLine data={data} />
      </Box>
    </StyledFlexContent>
  );
}

export const GraphicsSection = memo(GraphicsSectionComponent);
