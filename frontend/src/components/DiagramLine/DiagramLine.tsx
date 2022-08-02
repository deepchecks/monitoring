import { Box } from "@mui/material";
import { Chart, ChartArea, ChartData, registerables } from "chart.js";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { gradientColors } from "../../helpers/lineDataChangeFunction";

Chart.register(...registerables);

function createGradient(
  ctx: CanvasRenderingContext2D,
  area: ChartArea,
  colorStart: string,
  colorEnd: string
) {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

export interface DiagramLineProps {
  data: ChartData<"line">;
}

export default function DiagramLine({ data }: DiagramLineProps) {
  const chartRef = useRef<Chart<"line", number[], string>>();
  const [chartData, setChartData] = useState(data);

  useEffect(() => {
    const char = chartRef.current;

    if (!char) {
      return;
    }

    setChartData({
      ...data,
      datasets: data.datasets.map((el, i) => ({
        ...el,
        backgroundColor: createGradient(
          char.ctx,
          char.chartArea,
          gradientColors[i][0],
          gradientColors[i][1]
        ),
      })),
    });
  }, [chartRef, data]);

  return (
    <Box>
      <Line
        data={chartData}
        ref={chartRef}
        updateMode="active"
        options={{
          responsive: true,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
            },
          },
        }}
      />
    </Box>
  );
}
